-- Exercices assistés (moins de poids = mieux : tractions/dips assistés).
alter table exercises add column if not exists is_assisted boolean not null default false;

-- Préférence par utilisateur pour chaque complément (tout le monde démarre
-- à "non suivi" — la créatine par ex. ne concerne pas tout le monde).
create table if not exists user_supplements (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplement_name text not null references supplements(name) on delete cascade,
  enabled boolean not null default false,
  primary key (user_id, supplement_name)
);

alter table user_supplements enable row level security;
drop policy if exists "own supplement prefs" on user_supplements;
create policy "own supplement prefs" on user_supplements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Créneaux de séance habituels (jour de la semaine + heure), pour la notif
-- de motivation du matin qui mentionne "tu as séance aujourd'hui".
create table if not exists workout_schedule (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = dimanche, 1 = lundi, ...
  time time,
  primary key (user_id, weekday)
);

alter table workout_schedule enable row level security;
drop policy if exists "own workout schedule" on workout_schedule;
create policy "own workout schedule" on workout_schedule for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table profile add column if not exists morning_motivation_enabled boolean not null default true;
alter table profile add column if not exists supplement_reminder_enabled boolean not null default true;

-- ============ Cibles des rappels quotidiens (cron Vercel) ============
-- Protégées par un secret (pas de clé service-role disponible) : appelées
-- avec la clé publique, donc n'importe qui pourrait sinon les invoquer.
-- Le secret doit correspondre à CRON_SECRET côté Vercel.

create or replace function get_supplement_reminder_targets(p_secret text)
returns table(user_id uuid, endpoint text, p256dh text, auth_key text, missing_supplements text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret <> '6IKgHUM86RufywxveZiGGXoDAvmK2hLS' then
    raise exception 'Non autorisé';
  end if;

  return query
    select
      ps.user_id,
      ps.endpoint,
      ps.p256dh,
      ps.auth_key,
      array_agg(us.supplement_name)
    from user_supplements us
    join push_subscriptions ps on ps.user_id = us.user_id
    join profile pr on pr.user_id = us.user_id
    where us.enabled = true
      and pr.supplement_reminder_enabled = true
      and not exists (
        select 1 from supplement_logs sl
        where sl.user_id = us.user_id and sl.supplement_name = us.supplement_name and sl.date = current_date
      )
    group by ps.user_id, ps.endpoint, ps.p256dh, ps.auth_key;
end;
$$;

grant execute on function get_supplement_reminder_targets(text) to anon, authenticated;

create or replace function get_morning_motivation_targets(p_secret text)
returns table(user_id uuid, endpoint text, p256dh text, auth_key text, label text, has_workout_today boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret <> '6IKgHUM86RufywxveZiGGXoDAvmK2hLS' then
    raise exception 'Non autorisé';
  end if;

  return query
    select
      ps.user_id,
      ps.endpoint,
      ps.p256dh,
      ps.auth_key,
      coalesce(pr.pseudo, pr.email),
      exists (
        select 1 from workout_schedule ws
        where ws.user_id = ps.user_id and ws.weekday = extract(dow from current_date)::int
      )
    from push_subscriptions ps
    join profile pr on pr.user_id = ps.user_id
    where pr.morning_motivation_enabled = true;
end;
$$;

grant execute on function get_morning_motivation_targets(text) to anon, authenticated;
