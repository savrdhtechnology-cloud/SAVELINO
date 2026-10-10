-- Lets a signed-in worker read only their own team record (name and atelier role),
-- so the worker portal can show the right queues. Other workers' rows stay private.
create policy "team_members: own row read" on public.team_members
  for select using (user_id is not null and user_id = auth.uid());
