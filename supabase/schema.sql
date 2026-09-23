-- Schéma pour l'app de suivi sportif de Maxence
-- À exécuter dans le SQL editor de Supabase

-- Liste des exercices de musculation (référentiel)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null, -- ex: 'pecs', 'dos', 'jambes', 'epaules', 'bras', 'abdos', 'cardio', 'autre'
  description text, -- ce que travaille l'exercice, éditable dans l'app
  wger_id int unique, -- id de l'exercice sur wger.de, null si ajouté manuellement
  image_url text,
  created_at timestamptz default now()
);

-- Une séance de musculation
create table strength_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  time time, -- heure de la séance, optionnelle (permet de mieux croiser les stats)
  duration_minutes int, -- durée de la séance, utilisée pour estimer les calories brûlées
  feeling int check (feeling between 1 and 5), -- ressenti de la séance, 1 = très dur, 5 = très facile
  notes text,
  created_at timestamptz default now()
);

-- Chaque série effectuée dans une séance
create table strength_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references strength_sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  set_number int not null,
  reps int not null,
  weight_kg numeric(5,2) not null default 0,
  side text check (side in ('gauche', 'droit')), -- null = exercice bilatéral (les deux bras/jambes ensemble)
  created_at timestamptz default now()
);

-- Référentiel des muscles individuels (calqué sur la liste officielle wger.de,
-- pour rester cohérent avec les données récupérées via leur API)
create table muscles (
  id uuid primary key default gen_random_uuid(),
  wger_id int unique not null,
  name_fr text not null,
  name_en text not null,
  is_front boolean not null, -- true = visible de face, false = visible de dos
  created_at timestamptz default now()
);

insert into muscles (wger_id, name_fr, name_en, is_front) values
  (1, 'Biceps', 'Biceps brachii', true),
  (2, 'Deltoïde antérieur', 'Anterior deltoid', true),
  (3, 'Dentelé antérieur', 'Serratus anterior', true),
  (4, 'Grand pectoral', 'Pectoralis major', true),
  (5, 'Obliques', 'Obliquus externus', true),
  (6, 'Mollet (gastrocnémien)', 'Gastrocnemius', false),
  (7, 'Abdominaux (grand droit)', 'Rectus abdominis', true),
  (8, 'Grand fessier', 'Gluteus maximus', false),
  (9, 'Trapèzes', 'Trapezius', false),
  (10, 'Quadriceps', 'Quadriceps femoris', true),
  (11, 'Ischio-jambiers', 'Biceps femoris', false),
  (12, 'Grand dorsal', 'Latissimus dorsi', false),
  (13, 'Brachial', 'Brachialis', true),
  (14, 'Triceps', 'Triceps brachii', false),
  (15, 'Mollet (soléaire)', 'Soleus', false);

-- Association exercice <-> muscles travaillés, avec le rôle (primaire ou secondaire)
create table exercise_muscles (
  exercise_id uuid references exercises(id) on delete cascade,
  muscle_id uuid references muscles(id) on delete cascade,
  role text not null check (role in ('primaire', 'secondaire')),
  primary key (exercise_id, muscle_id)
);

-- Une sortie course à pied
create table runs (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  distance_km numeric(6,2) not null,
  duration_seconds int not null,
  avg_pace_seconds_per_km int generated always as (
    case when distance_km > 0 then round(duration_seconds / distance_km) else 0 end
  ) stored,
  run_type text not null default 'footing', -- 'footing' | 'fractionne' | 'sortie_longue' | 'autre'
  elevation_gain_m int, -- dénivelé positif, optionnel
  weather text, -- 'soleil' | 'pluie' | 'froid' | 'chaud', optionnel
  feeling text, -- ex: 'facile', 'moyen', 'dur'
  notes text,
  created_at timestamptz default now()
);

-- Suivi du poids de corps dans le temps
create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date unique,
  weight_kg numeric(5,1) not null,
  created_at timestamptz default now()
);

create index idx_weight_entries_date on weight_entries(date);

-- Suivi du sommeil (nombre d'heures dormies, une entrée par nuit)
create table sleep_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date unique, -- date du réveil
  hours numeric(3,1) not null,
  created_at timestamptz default now()
);

create index idx_sleep_entries_date on sleep_entries(date);

-- Entrées alimentaires (recherche via Open Food Facts ou saisie manuelle)
create table food_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  name text not null,
  quantity_g numeric(7,1) not null,
  protein_g numeric(6,2) not null default 0,
  calories_kcal numeric(7,1),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  off_code text, -- code produit Open Food Facts, null si saisie manuelle
  created_at timestamptz default now()
);

create index idx_food_entries_date on food_entries(date);

-- Bibliothèque d'aliments personnalisés (marque précise, valeurs saisies à la main
-- une fois, puis réutilisables en sélection rapide sans repasser par Open Food Facts)
create table custom_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ref_quantity_g numeric(7,1) not null, -- quantité de référence (ex: 50g pour "1 barre")
  protein_g numeric(6,2) not null default 0,
  calories_kcal numeric(7,1),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  created_at timestamptz default now()
);

-- Suivi de l'hydratation
create table water_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  amount_ml int not null,
  created_at timestamptz default now()
);

create index idx_water_entries_date on water_entries(date);

-- Suivi des suppléments (créatine, vitamine D, etc.) : une case à cocher par jour
create table supplements (
  name text primary key
);

insert into supplements (name) values ('Créatine');

create table supplement_logs (
  id uuid primary key default gen_random_uuid(),
  supplement_name text not null references supplements(name) on delete cascade,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique (supplement_name, date)
);

-- Profil utilisateur (une seule ligne, app mono-utilisateur)
create table profile (
  id int primary key default 1,
  sex text, -- 'homme' | 'femme'
  age int,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  activity_level text, -- 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif'
  goal text, -- 'seche' | 'maintien' | 'prise_de_masse'
  vma_kmh numeric(4,1), -- vitesse maximale aérobie estimée, en km/h
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Objectifs personnalisés avec barre de progression (ex: courir un semi en 1h50)
create table goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  unit text not null, -- 'km', 'kg', 'min', etc.
  start_value numeric(8,2) not null default 0,
  target_value numeric(8,2) not null,
  current_value numeric(8,2) not null default 0,
  target_date date,
  created_at timestamptz default now()
);

-- Index utiles pour trier/filtrer par date
create index idx_strength_sessions_date on strength_sessions(date);
create index idx_runs_date on runs(date);
create index idx_strength_sets_session on strength_sets(session_id);
create index idx_strength_sets_exercise on strength_sets(exercise_id);

-- Quelques exercices de base pour démarrer (tu pourras en ajouter via l'app)
insert into exercises (name, muscle_group) values
  ('Développé couché', 'pecs'),
  ('Squat', 'jambes'),
  ('Soulevé de terre', 'dos'),
  ('Tractions', 'dos'),
  ('Développé militaire', 'epaules'),
  ('Curl biceps', 'bras'),
  ('Dips', 'bras');
