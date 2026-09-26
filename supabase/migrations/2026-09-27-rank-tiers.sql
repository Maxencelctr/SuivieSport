-- Plus de paliers de rang, au-delà de "Vétéran".
create or replace function compute_rank(activity_count bigint)
returns text
language sql
immutable
as $$
  select case
    when activity_count >= 500 then 'Légende'
    when activity_count >= 350 then 'Élite'
    when activity_count >= 200 then 'Expert'
    when activity_count >= 100 then 'Vétéran'
    when activity_count >= 50 then 'Confirmé'
    when activity_count >= 10 then 'Régulier'
    else 'Débutant'
  end;
$$;
