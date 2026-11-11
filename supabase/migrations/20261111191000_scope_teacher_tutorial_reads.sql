-- Do not expose another teacher's private drafts to the reviewer role.
drop policy if exists "reviewers read submitted tutorials" on public.teacher_tutorials;
create policy "reviewers read submitted tutorials" on public.teacher_tutorials
  for select to authenticated using (
    has_role(auth.uid(), 'admin'::text)
    or (
      has_role(auth.uid(), 'teacher'::text)
      and status in ('in_review','verified','published')
    )
  );
