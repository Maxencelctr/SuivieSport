-- "Repas habituels" : enregistrer les aliments d'un repas du jour comme un
-- modèle réutilisable (ex: "Petit-déj habituel" = fromage blanc + beurre de
-- cacahuète + graines de chia), pour le reloger en un clic plus tard au lieu
-- de ressaisir chaque aliment à chaque fois.
create table if not exists meal_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  meal text not null check (meal in ('petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apresmidi', 'diner')),
  created_at timestamptz default now()
);

alter table meal_presets enable row level security;
drop policy if exists "own meal presets" on meal_presets;
create policy "own meal presets" on meal_presets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists meal_preset_items (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references meal_presets(id) on delete cascade,
  name text not null,
  quantity_g numeric(7,1) not null,
  protein_g numeric(6,1) not null default 0,
  calories_kcal numeric(7,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  off_code text
);

alter table meal_preset_items enable row level security;
drop policy if exists "own meal preset items" on meal_preset_items;
create policy "own meal preset items" on meal_preset_items for all
  using (exists (select 1 from meal_presets p where p.id = preset_id and p.user_id = auth.uid()))
  with check (exists (select 1 from meal_presets p where p.id = preset_id and p.user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
