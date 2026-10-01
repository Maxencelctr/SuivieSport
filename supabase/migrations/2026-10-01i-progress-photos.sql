-- Photos de progression : privées (contrairement aux preuves de défi), donc
-- bucket non public — accès uniquement via URL signée générée à la demande,
-- jamais via getPublicUrl.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress photo own read" on storage.objects;
create policy "progress photo own read" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "progress photo own upload" on storage.objects;
create policy "progress photo own upload" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "progress photo own delete" on storage.objects;
create policy "progress photo own delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  path text not null,
  created_at timestamptz default now()
);

alter table progress_photos enable row level security;
drop policy if exists "own progress photos" on progress_photos;
create policy "own progress photos" on progress_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_progress_photos_user_date on progress_photos(user_id, date);

NOTIFY pgrst, 'reload schema';
