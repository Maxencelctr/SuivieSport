-- À exécuter dans le SQL editor de Supabase (projet "suivi-sport") pour
-- mettre la base existante à jour : ajoute les objectifs typés "course" et
-- "musculation", connectés aux runs/séries déjà enregistrés (progression
-- calculée automatiquement, plus besoin de mise à jour manuelle pour ces
-- deux types). Les objectifs existants deviennent goal_type = 'generique'
-- et continuent de fonctionner comme avant.

alter table goals add column if not exists goal_type text not null default 'generique'
  check (goal_type in ('generique', 'course', 'musculation'));
alter table goals add column if not exists distance_km numeric(6,2);
alter table goals add column if not exists exercise_id uuid references exercises(id) on delete set null;
alter table goals add column if not exists target_reps int;
