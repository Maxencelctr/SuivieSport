-- À exécuter dans le SQL editor de Supabase (projet "suivi-sport") pour
-- mettre la base existante à jour : ajoute le créneau de repas sur chaque
-- entrée alimentaire (petit-déjeuner / collation / déjeuner / collation /
-- dîner), absent du schéma initial. Les entrées existantes restent avec
-- meal = null (affichées dans un groupe "Non classé" par l'app).

alter table food_entries add column if not exists meal text
  check (meal in ('petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apresmidi', 'diner'));
