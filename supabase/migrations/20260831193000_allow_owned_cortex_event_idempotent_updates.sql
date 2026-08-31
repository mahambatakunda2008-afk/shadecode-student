drop policy if exists "cortex_events_update_own" on public.cortex_events;

create policy "cortex_events_update_own"
  on public.cortex_events
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
