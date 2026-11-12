drop policy if exists exam_completion_outbox_service_role_all on public.exam_completion_outbox;
create policy exam_completion_outbox_service_role_all
  on public.exam_completion_outbox
  for all
  to service_role
  using (true)
  with check (true);
