-- Classement entre amis (volume soulevé / km courus sur 7 jours). Les
-- entrées brutes restent privées (RLS inchangé) : cette fonction ne renvoie
-- que des totaux agrégés, et seulement pour soi + les amis confirmés.

drop function if exists get_friends_leaderboard();
create or replace function get_friends_leaderboard()
returns table(person_id uuid, label text, volume_7j numeric, km_7j numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with people as (
      select auth.uid() as uid
      union
      select case when r.from_user_id = auth.uid() then r.to_user_id else r.from_user_id end
      from friend_requests r
      where r.status = 'accepted' and auth.uid() in (r.from_user_id, r.to_user_id)
    )
    select
      p.uid,
      coalesce(pr.pseudo, pr.email, 'Utilisateur'),
      coalesce((
        select sum(ss.reps * ss.weight_kg)
        from strength_sets ss
        join strength_sessions se on se.id = ss.session_id
        where se.user_id = p.uid and se.date >= current_date - 6
      ), 0),
      coalesce((
        select sum(r.distance_km)
        from runs r
        where r.user_id = p.uid and r.date >= current_date - 6
      ), 0)
    from people p
    join profile pr on pr.user_id = p.uid;
end;
$$;

grant execute on function get_friends_leaderboard() to authenticated;
