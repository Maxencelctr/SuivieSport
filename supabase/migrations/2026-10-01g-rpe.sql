-- Effort perçu (RPE, 1-10) optionnel par série.
alter table strength_sets add column if not exists rpe smallint check (rpe between 1 and 10);

NOTIFY pgrst, 'reload schema';
