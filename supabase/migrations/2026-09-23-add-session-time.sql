-- À exécuter dans le SQL editor de Supabase (projet "suivi-sport") pour
-- mettre la base existante à jour : ajoute l'heure de séance, absente du
-- schéma initial.

alter table strength_sessions add column if not exists time time;
