-- Suivi des pas. "source" distingue une saisie manuelle d'une future
-- synchronisation automatique (Google Fit pour Android, Raccourcis Apple
-- pour iPhone — aucune API web n'existe côté Apple Santé) : un upsert
-- automatique ne doit pas écraser silencieusement une valeur plus précise
-- déjà saisie à la main pour le même jour, donc le choix se fait côté appli
-- au moment de l'upsert plutôt qu'en base.
create table if not exists step_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  steps int not null check (steps >= 0),
  source text not null default 'manual' check (source in ('manual', 'google_fit', 'shortcuts')),
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table step_entries enable row level security;
drop policy if exists "own step entries" on step_entries;
create policy "own step entries" on step_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_step_entries_user_date on step_entries(user_id, date);

-- Objectif de pas quotidien (nul = pas d'objectif défini).
alter table profile add column if not exists step_goal int;

NOTIFY pgrst, 'reload schema';
