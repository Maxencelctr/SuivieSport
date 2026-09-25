-- Photo de profil : colonne + bucket de stockage dédié.

alter table profile add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Photos publiques en lecture (ce sont des avatars, pas des données
-- sensibles) mais chacun ne peut écrire que dans son propre dossier
-- (avatars/<user_id>/...), vérifié via le premier segment du chemin.
drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatar own upload" on storage.objects;
create policy "avatar own upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar own update" on storage.objects;
create policy "avatar own update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar own delete" on storage.objects;
create policy "avatar own delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Le classement entre amis renvoie aussi l'avatar (utile pour l'affichage).
drop function if exists get_friends();
create or replace function get_friends()
returns table(friend_id uuid, friend_label text, friend_avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end,
      coalesce(p.pseudo, p.email),
      p.avatar_url
    from friend_requests r
    join profile p on p.user_id = (case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end)
    where r.status = 'accepted' and auth.uid() in (r.from_user_id, r.to_user_id);
end;
$$;

grant execute on function get_friends() to authenticated;
