-- Système d'amis + défis + notifications push.

create extension if not exists pgcrypto;

-- Chaque profil a un email (copié depuis auth.users à l'inscription) et un
-- code d'invitation court à partager pour devenir ami.
alter table profile add column if not exists email text;
alter table profile add column if not exists invite_code text unique default encode(gen_random_bytes(5), 'hex');

-- Backfill pour les comptes déjà créés avant cette migration.
update profile set email = (select u.email from auth.users u where u.id = profile.user_id) where email is null;
update profile set invite_code = encode(gen_random_bytes(5), 'hex') where invite_code is null;

-- Crée automatiquement une ligne profile (avec email + code d'invitation)
-- dès l'inscription, sans attendre que l'utilisateur visite /profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Amitiés : une ligne par sens (symétrique), pour que "mes amis" soit un
-- simple select where user_id = auth.uid().
create table if not exists friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Défis envoyés entre amis (ex: "fais 10 pompes maintenant").
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'dismissed')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_challenges_to_user on challenges(to_user_id);
create index if not exists idx_challenges_from_user on challenges(from_user_id);

-- Abonnements push (un par appareil/navigateur).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);

alter table friendships enable row level security;
alter table challenges enable row level security;
alter table push_subscriptions enable row level security;

-- Amitiés : chacun voit sa propre liste ; pas d'insert direct côté client
-- (uniquement via redeem_invite_code, pour valider le code et créer les
-- deux sens de la relation de façon atomique).
create policy "see own friendships" on friendships for select using (auth.uid() = user_id);
create policy "remove own friendship" on friendships for delete using (auth.uid() = user_id);

-- Défis : visibles par l'expéditeur et le destinataire. Création uniquement
-- entre amis, mise à jour de statut par l'un ou l'autre (marquer fait /
-- ignorer / annuler).
create policy "see own challenges" on challenges for select using (auth.uid() in (from_user_id, to_user_id));
create policy "send to a friend" on challenges for insert with check (
  auth.uid() = from_user_id
  and exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = to_user_id)
);
create policy "update own challenges" on challenges for update using (auth.uid() in (from_user_id, to_user_id));

-- Abonnements push : chacun gère les siens.
create policy "own subscriptions" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Redeem d'un code d'invitation : cherche le propriétaire du code (accès
-- élevé nécessaire, un utilisateur normal ne peut pas lire le profil d'un
-- autre) et crée l'amitié dans les deux sens.
create or replace function redeem_invite_code(code text)
returns table(friend_id uuid, friend_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  target_email text;
begin
  select user_id, email into target, target_email from profile where invite_code = code;
  if target is null then
    raise exception 'Code invalide';
  end if;
  if target = auth.uid() then
    raise exception 'Tu ne peux pas t''ajouter toi-même';
  end if;

  insert into friendships (user_id, friend_id) values (auth.uid(), target) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (target, auth.uid()) on conflict do nothing;

  return query select target, target_email;
end;
$$;

grant execute on function redeem_invite_code(text) to authenticated;

-- Liste des amis avec leur email (le client ne peut pas lire profile d'un
-- autre utilisateur directement, RLS l'en empêche : on passe par cette
-- fonction, restreinte aux amitiés existantes).
create or replace function get_friends()
returns table(friend_id uuid, friend_email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select f.friend_id, p.email
    from friendships f
    join profile p on p.user_id = f.friend_id
    where f.user_id = auth.uid();
end;
$$;

grant execute on function get_friends() to authenticated;

-- Abonnements push d'un ami (pour lui envoyer une notification quand on lui
-- envoie un défi) : uniquement si on est bien ami avec lui.
create or replace function get_friend_push_subscriptions(target uuid)
returns table(endpoint text, p256dh text, auth_key text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from friendships where user_id = auth.uid() and friend_id = target) then
    raise exception 'Pas autorisé';
  end if;
  return query select ps.endpoint, ps.p256dh, ps.auth_key from push_subscriptions ps where ps.user_id = target;
end;
$$;

grant execute on function get_friend_push_subscriptions(uuid) to authenticated;
