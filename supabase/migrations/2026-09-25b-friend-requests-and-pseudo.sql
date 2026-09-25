-- Passe le système d'amis en demande / acceptation (au lieu d'ajout
-- immédiat) et ajoute un pseudo affiché partout à la place de l'email.

alter table profile add column if not exists pseudo text unique;

-- Demandes d'amis : une ligne par demande, direction "de -> vers".
-- Une amitié effective = une ligne avec status = 'accepted'.
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists idx_friend_requests_to on friend_requests(to_user_id);
create index if not exists idx_friend_requests_from on friend_requests(from_user_id);

-- Reprend les amitiés déjà créées par l'ancien système (accès direct) comme
-- des demandes acceptées, une seule ligne par paire.
insert into friend_requests (from_user_id, to_user_id, status, responded_at)
select user_id, friend_id, 'accepted', now()
from friendships
where user_id < friend_id
on conflict (from_user_id, to_user_id) do nothing;

drop policy if exists "send to a friend" on challenges;
drop policy if exists "see own friendships" on friendships;
drop policy if exists "remove own friendship" on friendships;
drop table if exists friendships;

alter table friend_requests enable row level security;

-- Lecture : les deux personnes concernées par la demande. Pas d'insert/update
-- direct côté client : tout passe par les fonctions ci-dessous, qui
-- valident le code / l'identité de qui répond.
create policy "see own requests" on friend_requests for select using (auth.uid() in (from_user_id, to_user_id));
create policy "remove own requests" on friend_requests for delete using (auth.uid() in (from_user_id, to_user_id));

-- Un défi ne peut être envoyé qu'à quelqu'un dont la demande est acceptée.
create policy "send to a friend" on challenges for insert with check (
  auth.uid() = from_user_id
  and exists (
    select 1 from friend_requests r
    where r.status = 'accepted'
      and ((r.from_user_id = auth.uid() and r.to_user_id = to_user_id)
        or (r.to_user_id = auth.uid() and r.from_user_id = to_user_id))
  )
);

-- Redeem d'un code : crée une demande "pending" au lieu d'ajouter direct.
-- drop nécessaire : la forme de retour change (friend_email -> friend_label),
-- "create or replace" seul refuse ce genre de changement.
drop function if exists redeem_invite_code(text);
create or replace function redeem_invite_code(code text)
returns table(friend_id uuid, friend_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  target_label text;
  existing_status text;
begin
  select user_id, coalesce(pseudo, email) into target, target_label from profile where invite_code = code;
  if target is null then
    raise exception 'Code invalide';
  end if;
  if target = auth.uid() then
    raise exception 'Tu ne peux pas t''ajouter toi-même';
  end if;

  select status into existing_status from friend_requests
    where (from_user_id = auth.uid() and to_user_id = target)
       or (from_user_id = target and to_user_id = auth.uid());

  if existing_status = 'accepted' then
    raise exception 'Vous êtes déjà amis';
  elsif existing_status = 'pending' then
    raise exception 'Demande déjà envoyée';
  elsif existing_status = 'declined' then
    update friend_requests set status = 'pending', created_at = now(), responded_at = null
      where (from_user_id = auth.uid() and to_user_id = target)
         or (from_user_id = target and to_user_id = auth.uid());
  else
    insert into friend_requests (from_user_id, to_user_id) values (auth.uid(), target);
  end if;

  return query select target, target_label;
end;
$$;

grant execute on function redeem_invite_code(text) to authenticated;

-- Demandes reçues en attente de réponse.
create or replace function get_friend_requests()
returns table(request_id uuid, from_user_id uuid, from_label text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.id, r.from_user_id, coalesce(p.pseudo, p.email)
    from friend_requests r
    join profile p on p.user_id = r.from_user_id
    where r.to_user_id = auth.uid() and r.status = 'pending';
end;
$$;

grant execute on function get_friend_requests() to authenticated;

-- Accepter / refuser une demande reçue.
create or replace function respond_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update friend_requests
  set status = case when accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = request_id and to_user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Demande introuvable';
  end if;
end;
$$;

grant execute on function respond_friend_request(uuid, boolean) to authenticated;

-- Liste des amis confirmés, avec pseudo (ou email si pas de pseudo défini).
-- drop nécessaire : la forme de retour change (friend_email -> friend_label).
drop function if exists get_friends();
create or replace function get_friends()
returns table(friend_id uuid, friend_label text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end,
      coalesce(p.pseudo, p.email)
    from friend_requests r
    join profile p on p.user_id = (case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end)
    where r.status = 'accepted' and auth.uid() in (r.from_user_id, r.to_user_id);
end;
$$;

grant execute on function get_friends() to authenticated;

-- Abonnements push d'un ami confirmé uniquement.
create or replace function get_friend_push_subscriptions(target uuid)
returns table(endpoint text, p256dh text, auth_key text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from friend_requests
    where status = 'accepted'
      and ((from_user_id = auth.uid() and to_user_id = target)
        or (to_user_id = auth.uid() and from_user_id = target))
  ) then
    raise exception 'Pas autorisé';
  end if;
  return query select ps.endpoint, ps.p256dh, ps.auth_key from push_subscriptions ps where ps.user_id = target;
end;
$$;

grant execute on function get_friend_push_subscriptions(uuid) to authenticated;
