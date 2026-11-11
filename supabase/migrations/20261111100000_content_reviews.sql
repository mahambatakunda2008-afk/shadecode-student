-- Teacher review of hand-authored question banks.
-- Additive only: new role row, new table, new policies. Nothing existing is altered.

insert into public.roles (name, description)
select 'teacher', 'Can review built-in question banks for correctness and syllabus fit'
where not exists (select 1 from public.roles where name = 'teacher');

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  bank text not null,
  verdict text not null check (verdict in ('correct', 'wrong_answer', 'ambiguous', 'out_of_syllabus')),
  note text check (note is null or char_length(note) <= 1000),
  reviewer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  unique (question_id, reviewer_id)
);

create index if not exists content_reviews_bank_idx on public.content_reviews (bank);
create index if not exists content_reviews_question_idx on public.content_reviews (question_id);

alter table public.content_reviews enable row level security;

create policy "reviewers read content reviews" on public.content_reviews
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::text) or has_role(auth.uid(), 'teacher'::text));

create policy "reviewers insert own content reviews" on public.content_reviews
  for insert to authenticated
  with check (reviewer_id = auth.uid() and (has_role(auth.uid(), 'admin'::text) or has_role(auth.uid(), 'teacher'::text)));

create policy "reviewers update own content reviews" on public.content_reviews
  for update to authenticated
  using (reviewer_id = auth.uid() and (has_role(auth.uid(), 'admin'::text) or has_role(auth.uid(), 'teacher'::text)))
  with check (reviewer_id = auth.uid());

create policy "reviewers delete own content reviews" on public.content_reviews
  for delete to authenticated
  using (reviewer_id = auth.uid());
