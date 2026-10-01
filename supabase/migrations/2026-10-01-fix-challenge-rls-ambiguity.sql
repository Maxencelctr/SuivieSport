-- La policy précédente comparait "r.to_user_id = to_user_id" (et pareil
-- pour le cooldown sur challenges c2) sans préciser à quelle table
-- appartient le "to_user_id" de droite. Comme ce nom de colonne existe
-- aussi dans friend_requests/challenges elles-mêmes, Postgres résout la
-- référence non qualifiée vers la table la plus proche (la sous-requête)
-- au lieu de la ligne en cours d'insertion — la vérification "c'est bien
-- mon ami"/"pas de cooldown" devient incohérente et peut bloquer à tort.
drop policy if exists "send to a friend" on challenges;
create policy "send to a friend" on challenges for insert with check (
  auth.uid() = challenges.from_user_id
  and exists (
    select 1 from friend_requests r
    where r.status = 'accepted'
      and ((r.from_user_id = auth.uid() and r.to_user_id = challenges.to_user_id)
        or (r.to_user_id = auth.uid() and r.from_user_id = challenges.to_user_id))
  )
  and not exists (
    select 1 from challenges c2
    where c2.from_user_id = auth.uid()
      and c2.to_user_id = challenges.to_user_id
      and c2.created_at > now() - interval '24 hours'
  )
);

NOTIFY pgrst, 'reload schema';
