-- Système de compte : chaque utilisateur ne voit et ne modifie que ses
-- propres données. Les données de test existantes sont supprimées (confirmé
-- avec l'utilisateur, pas de vraies données à conserver).

truncate table strength_sets, strength_sessions, runs, weight_entries, sleep_entries,
  food_entries, custom_foods, water_entries, supplement_logs, goals, profile cascade;

-- Ajoute le propriétaire sur chaque table de données personnelles. Le
-- "default auth.uid()" évite de devoir toucher tous les inserts existants
-- dans le code : la ligne est automatiquement rattachée à qui l'a créée.
alter table strength_sessions add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table runs add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table weight_entries add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table sleep_entries add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table food_entries add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table custom_foods add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table water_entries add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table supplement_logs add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table goals add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

create index idx_strength_sessions_user on strength_sessions(user_id);
create index idx_runs_user on runs(user_id);
create index idx_weight_entries_user on weight_entries(user_id);
create index idx_sleep_entries_user on sleep_entries(user_id);
create index idx_food_entries_user on food_entries(user_id);
create index idx_custom_foods_user on custom_foods(user_id);
create index idx_water_entries_user on water_entries(user_id);
create index idx_supplement_logs_user on supplement_logs(user_id);
create index idx_goals_user on goals(user_id);

-- poids/sommeil : une entrée par jour PAR utilisateur (avant : globalement unique)
alter table weight_entries drop constraint weight_entries_date_key;
alter table weight_entries add constraint weight_entries_user_date_key unique (user_id, date);
alter table sleep_entries drop constraint sleep_entries_date_key;
alter table sleep_entries add constraint sleep_entries_user_date_key unique (user_id, date);

-- supplement_logs : une coche par supplément/jour/utilisateur
alter table supplement_logs drop constraint supplement_logs_supplement_name_date_key;
alter table supplement_logs add constraint supplement_logs_supplement_name_date_user_key unique (supplement_name, date, user_id);

-- profile : une ligne par utilisateur (avant : une seule ligne globale id=1)
alter table profile drop constraint single_row;
alter table profile drop column id;
alter table profile add column user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade;

-- Active la sécurité niveau ligne partout : sans policy, une table avec RLS
-- activé ne renvoie plus aucune ligne, même via la clé publishable.
alter table strength_sessions enable row level security;
alter table strength_sets enable row level security;
alter table runs enable row level security;
alter table weight_entries enable row level security;
alter table sleep_entries enable row level security;
alter table food_entries enable row level security;
alter table custom_foods enable row level security;
alter table water_entries enable row level security;
alter table supplement_logs enable row level security;
alter table goals enable row level security;
alter table profile enable row level security;
alter table exercises enable row level security;
alter table exercise_muscles enable row level security;
alter table muscles enable row level security;
alter table supplements enable row level security;

-- Tables personnelles : chacun ne voit/modifie que ses propres lignes
create policy "own rows" on strength_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on weight_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on sleep_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on food_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on custom_foods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on water_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on supplement_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on profile for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- strength_sets n'a pas de user_id direct (elle appartient à une séance) :
-- on vérifie via la séance parente.
create policy "own via session" on strength_sets for all
  using (exists (select 1 from strength_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from strength_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- Référentiel partagé (exercices, muscles, suppléments) : bibliothèque commune
-- à tous les utilisateurs connectés, pas de données personnelles dedans.
create policy "read for authenticated" on muscles for select using (auth.role() = 'authenticated');
create policy "read for authenticated" on supplements for select using (auth.role() = 'authenticated');
create policy "insert for authenticated" on supplements for insert with check (auth.role() = 'authenticated');
create policy "read for authenticated" on exercises for select using (auth.role() = 'authenticated');
create policy "insert for authenticated" on exercises for insert with check (auth.role() = 'authenticated');
create policy "update for authenticated" on exercises for update using (auth.role() = 'authenticated');
create policy "read for authenticated" on exercise_muscles for select using (auth.role() = 'authenticated');
create policy "insert for authenticated" on exercise_muscles for insert with check (auth.role() = 'authenticated');
