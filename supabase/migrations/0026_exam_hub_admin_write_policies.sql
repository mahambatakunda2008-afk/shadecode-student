-- 0026_exam_hub_admin_write_policies.sql
-- Defense in depth: even though ingestion (admin upload route + bulk
-- script) uses the service-role key and therefore bypasses RLS entirely,
-- these policies ensure that IF a bug ever routes a write through the
-- anon-key session client instead, only admins can mutate the catalog.
-- Uses the same has_role() RPC as the rest of the app's RBAC system.

create policy "syllabi admin write" on syllabi
  for insert with check (has_role(auth.uid(), 'admin'));
create policy "syllabi admin update" on syllabi
  for update using (has_role(auth.uid(), 'admin'));
create policy "syllabi admin delete" on syllabi
  for delete using (has_role(auth.uid(), 'admin'));

create policy "past_papers admin write" on past_papers
  for insert with check (has_role(auth.uid(), 'admin'));
create policy "past_papers admin update" on past_papers
  for update using (has_role(auth.uid(), 'admin'));
create policy "past_papers admin delete" on past_papers
  for delete using (has_role(auth.uid(), 'admin'));
