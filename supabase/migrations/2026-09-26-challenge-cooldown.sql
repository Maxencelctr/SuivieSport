-- Anti-spam : pas plus d'un défi envoyé à un même ami toutes les 24h.
drop policy if exists "send to a friend" on challenges;
create policy "send to a friend" on challenges for insert with check (
  auth.uid() = from_user_id
  and exists (
    select 1 from friend_requests r
    where r.status = 'accepted'
      and ((r.from_user_id = auth.uid() and r.to_user_id = to_user_id)
        or (r.to_user_id = auth.uid() and r.from_user_id = to_user_id))
  )
  and not exists (
    select 1 from challenges c2
    where c2.from_user_id = auth.uid()
      and c2.to_user_id = to_user_id
      and c2.created_at > now() - interval '24 hours'
  )
);
