-- À exécuter dans le SQL editor de Supabase (projet "suivi-sport") pour
-- mettre la base existante à jour : ajoute l'objectif d'hydratation
-- quotidien (en ml), utilisé par la goutte d'eau animée sur /alimentation.

alter table profile add column if not exists water_goal_ml int default 2500;
