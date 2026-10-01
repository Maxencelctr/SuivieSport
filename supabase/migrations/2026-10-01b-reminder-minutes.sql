-- Granularité minute pour les rappels (ex: 9h30 au lieu de seulement 9h).
-- Le cron qui déclenche ces rappels tourne maintenant toutes les 15 minutes
-- (voir .github/workflows/hourly-reminders.yml), donc seuls 0/15/30/45 ont
-- vraiment un sens comme valeur de minute.
alter table profile add column if not exists morning_motivation_minute smallint not null default 0 check (morning_motivation_minute in (0, 15, 30, 45));
alter table profile add column if not exists supplement_reminder_minute smallint not null default 0 check (supplement_reminder_minute in (0, 15, 30, 45));

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
      and pr.supplement_reminder_minute = (extract(minute from now() at time zone 'Europe/Paris')::int / 15) * 15
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
      and pr.morning_motivation_hour = extract(hour from now() at time zone 'Europe/Paris')::int
      and pr.morning_motivation_minute = (extract(minute from now() at time zone 'Europe/Paris')::int / 15) * 15;
end;
$$;

grant execute on function get_morning_motivation_targets(text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
