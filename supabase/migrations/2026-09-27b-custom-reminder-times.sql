-- Horaire de rappel choisi par chaque utilisateur (0-23, heure de Paris)
-- au lieu d'un horaire fixe pour tout le monde. Le calcul se fait via
-- "at time zone 'Europe/Paris'", donc l'heure d'été/hiver est gérée
-- automatiquement par Postgres (fini le décalage ±1h selon la saison).

alter table profile add column if not exists morning_motivation_hour smallint not null default 9 check (morning_motivation_hour between 0 and 23);
alter table profile add column if not exists supplement_reminder_hour smallint not null default 20 check (supplement_reminder_hour between 0 and 23);

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
      and pr.supplement_reminder_hour = extract(hour from now() at time zone 'Europe/Paris')::int
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
    where pr.morning_motivation_enabled = true
      and pr.morning_motivation_hour = extract(hour from now() at time zone 'Europe/Paris')::int;
end;
$$;

grant execute on function get_morning_motivation_targets(text) to anon, authenticated;
