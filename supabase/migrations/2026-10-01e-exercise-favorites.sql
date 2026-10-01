-- Exercices épinglés par utilisateur (exercises est un catalogue partagé,
-- donc le "favori" ne peut pas être un simple booléen sur la table elle-même).
create table if not exists exercise_favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, exercise_id)
);

alter table exercise_favorites enable row level security;
drop policy if exists "own exercise favorites" on exercise_favorites;
create policy "own exercise favorites" on exercise_favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
