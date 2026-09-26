-- Fil d'activité + réactions, défis/duels, preuve photo, rangs.

-- ============ Réactions (fil d'activité + défis relevés) ============
create table if not exists activity_reactions (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('session', 'run', 'challenge')),
  activity_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (activity_type, activity_id, user_id, emoji)
);

create index if not exists idx_activity_reactions_target on activity_reactions(activity_type, activity_id);

alter table activity_reactions enable row level security;
-- Lecture large (nécessaire pour afficher les compteurs sur le fil) : pas de
-- donnée sensible ici, juste "qui a réagi avec quel emoji". Écriture
-- uniquement via react_to_activity, qui vérifie l'amitié avec le propriétaire.
drop policy if exists "read reactions" on activity_reactions;
create policy "read reactions" on activity_reactions for select using (auth.role() = 'authenticated');

create or replace function react_to_activity(p_type text, p_activity_id uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  authorized boolean := false;
begin
  if p_type = 'session' then
    select user_id into owner from strength_sessions where id = p_activity_id;
  elsif p_type = 'run' then
    select user_id into owner from runs where id = p_activity_id;
  elsif p_type = 'challenge' then
    select case when from_user_id = auth.uid() then to_user_id else from_user_id end into owner
    from challenges where id = p_activity_id and auth.uid() in (from_user_id, to_user_id);
  else
    raise exception 'Type invalide';
  end if;

  if owner is null then
    raise exception 'Introuvable';
  end if;

  if owner = auth.uid() then
    authorized := true;
  elsif exists (
    select 1 from friend_requests r
    where r.status = 'accepted'
      and ((r.from_user_id = auth.uid() and r.to_user_id = owner) or (r.to_user_id = auth.uid() and r.from_user_id = owner))
  ) then
    authorized := true;
  end if;

  if not authorized then
    raise exception 'Pas autorisé';
  end if;

  if exists (
    select 1 from activity_reactions
    where activity_type = p_type and activity_id = p_activity_id and user_id = auth.uid() and emoji = p_emoji
  ) then
    delete from activity_reactions
    where activity_type = p_type and activity_id = p_activity_id and user_id = auth.uid() and emoji = p_emoji;
  else
    insert into activity_reactions (activity_type, activity_id, user_id, emoji) values (p_type, p_activity_id, auth.uid(), p_emoji);
  end if;
end;
$$;

grant execute on function react_to_activity(text, uuid, text) to authenticated;

-- ============ Fil d'activité (soi + amis confirmés) ============
create or replace function get_friends_feed(limit_count int default 20)
returns table(
  activity_type text,
  activity_id uuid,
  owner_id uuid,
  owner_label text,
  owner_avatar_url text,
  activity_date date,
  summary text,
  created_at timestamptz,
  reactions json
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with people as (
      select auth.uid() as uid
      union
      select case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end
      from friend_requests r
      where r.status = 'accepted' and auth.uid() in (r.from_user_id, r.to_user_id)
    ),
    sessions_feed as (
      select
        'session'::text as activity_type,
        se.id as activity_id,
        se.user_id as owner_id,
        se.date as activity_date,
        se.created_at,
        (
          select count(distinct ss.exercise_id)::text || ' exercice(s) · ' || count(*)::text || ' série(s)'
          from strength_sets ss where ss.session_id = se.id
        ) as summary
      from strength_sessions se
      where se.user_id in (select uid from people)
    ),
    runs_feed as (
      select
        'run'::text as activity_type,
        r.id as activity_id,
        r.user_id as owner_id,
        r.date as activity_date,
        r.created_at,
        (r.distance_km::text || ' km en ' || (r.duration_seconds / 60)::text || ' min') as summary
      from runs r
      where r.user_id in (select uid from people)
    ),
    combined as (
      select * from sessions_feed
      union all
      select * from runs_feed
    )
    select
      c.activity_type,
      c.activity_id,
      c.owner_id,
      coalesce(p.pseudo, p.email),
      p.avatar_url,
      c.activity_date,
      c.summary,
      c.created_at,
      coalesce((
        select json_agg(json_build_object('emoji', ar.emoji, 'count', ar.cnt, 'reacted_by_me', ar.reacted_by_me))
        from (
          select emoji, count(*) as cnt, bool_or(user_id = auth.uid()) as reacted_by_me
          from activity_reactions
          where activity_type = c.activity_type and activity_id = c.activity_id
          group by emoji
        ) ar
      ), '[]'::json)
    from combined c
    join profile p on p.user_id = c.owner_id
    order by c.created_at desc
    limit limit_count;
end;
$$;

grant execute on function get_friends_feed(int) to authenticated;

-- ============ Preuve photo optionnelle sur un défi relevé ============
alter table challenges add column if not exists proof_url text;

insert into storage.buckets (id, name, public)
values ('challenge-proofs', 'challenge-proofs', true)
on conflict (id) do nothing;

drop policy if exists "proof public read" on storage.objects;
create policy "proof public read" on storage.objects for select using (bucket_id = 'challenge-proofs');
drop policy if exists "proof own upload" on storage.objects;
create policy "proof own upload" on storage.objects for insert
  with check (bucket_id = 'challenge-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "proof own update" on storage.objects;
create policy "proof own update" on storage.objects for update
  using (bucket_id = 'challenge-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "proof own delete" on storage.objects;
create policy "proof own delete" on storage.objects for delete
  using (bucket_id = 'challenge-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ Défis collectifs / duels ============
create table if not exists duels (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opponent_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('km', 'volume', 'sessions')),
  starts_at date not null default current_date,
  ends_at date not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'finished')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  check (created_by <> opponent_id)
);

alter table duels enable row level security;
drop policy if exists "see own duels" on duels;
create policy "see own duels" on duels for select using (auth.uid() in (created_by, opponent_id));
-- Pas d'insert/update direct : create_duel / respond_duel valident l'amitié
-- et qui a le droit de répondre.

create or replace function create_duel(p_opponent_id uuid, p_metric text, p_days int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not exists (
    select 1 from friend_requests r
    where r.status = 'accepted'
      and ((r.from_user_id = auth.uid() and r.to_user_id = p_opponent_id)
        or (r.to_user_id = auth.uid() and r.from_user_id = p_opponent_id))
  ) then
    raise exception 'Vous devez être amis';
  end if;

  insert into duels (created_by, opponent_id, metric, ends_at)
  values (auth.uid(), p_opponent_id, p_metric, current_date + p_days)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function respond_duel(p_duel_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update duels
  set status = case when p_accept then 'active' else 'declined' end,
      responded_at = now(),
      starts_at = case when p_accept then current_date else starts_at end,
      ends_at = case when p_accept then current_date + (ends_at - starts_at) else ends_at end
  where id = p_duel_id and opponent_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Duel introuvable';
  end if;
end;
$$;

create or replace function get_my_duels()
returns table(
  id uuid, created_by uuid, opponent_id uuid, metric text, starts_at date, ends_at date, status text,
  created_by_label text, opponent_label text,
  my_progress numeric, opponent_progress numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      d.id, d.created_by, d.opponent_id, d.metric, d.starts_at, d.ends_at, d.status,
      coalesce(pc.pseudo, pc.email),
      coalesce(po.pseudo, po.email),
      case d.metric
        when 'km' then coalesce((
          select sum(r.distance_km) from runs r
          where r.user_id = auth.uid() and r.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
        when 'volume' then coalesce((
          select sum(ss.reps * ss.weight_kg) from strength_sets ss
          join strength_sessions se on se.id = ss.session_id
          where se.user_id = auth.uid() and se.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
        else coalesce((
          select count(*) from strength_sessions se
          where se.user_id = auth.uid() and se.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
      end,
      case d.metric
        when 'km' then coalesce((
          select sum(r.distance_km) from runs r
          where r.user_id = (case when d.created_by = auth.uid() then d.opponent_id else d.created_by end)
            and r.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
        when 'volume' then coalesce((
          select sum(ss.reps * ss.weight_kg) from strength_sets ss
          join strength_sessions se on se.id = ss.session_id
          where se.user_id = (case when d.created_by = auth.uid() then d.opponent_id else d.created_by end)
            and se.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
        else coalesce((
          select count(*) from strength_sessions se
          where se.user_id = (case when d.created_by = auth.uid() then d.opponent_id else d.created_by end)
            and se.date between d.starts_at and least(d.ends_at, current_date)
        ), 0)
      end
    from duels d
    join profile pc on pc.user_id = d.created_by
    join profile po on po.user_id = d.opponent_id
    where auth.uid() in (d.created_by, d.opponent_id)
    order by d.created_at desc;
end;
$$;

grant execute on function create_duel(uuid, text, int) to authenticated;
grant execute on function respond_duel(uuid, boolean) to authenticated;
grant execute on function get_my_duels() to authenticated;

-- ============ Rang (Débutant / Régulier / Confirmé / Vétéran) ============
create or replace function compute_rank(activity_count bigint)
returns text
language sql
immutable
as $$
  select case
    when activity_count >= 150 then 'Vétéran'
    when activity_count >= 50 then 'Confirmé'
    when activity_count >= 10 then 'Régulier'
    else 'Débutant'
  end;
$$;

drop function if exists get_friends();
create or replace function get_friends()
returns table(friend_id uuid, friend_label text, friend_avatar_url text, friend_rank text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      f.fid,
      coalesce(p.pseudo, p.email),
      p.avatar_url,
      compute_rank((
        (select count(*) from strength_sessions where user_id = f.fid) +
        (select count(*) from runs where user_id = f.fid)
      ))
    from (
      select case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end as fid
      from friend_requests r
      where r.status = 'accepted' and auth.uid() in (r.from_user_id, r.to_user_id)
    ) f
    join profile p on p.user_id = f.fid;
end;
$$;

grant execute on function get_friends() to authenticated;
