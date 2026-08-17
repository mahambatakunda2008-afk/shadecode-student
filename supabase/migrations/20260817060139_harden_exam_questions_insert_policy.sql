drop policy if exists "exam_questions admin write" on public.exam_questions;

create policy "exam_questions admin write"
on public.exam_questions
for insert
to authenticated
with check (has_role(auth.uid(), 'admin'::text));
