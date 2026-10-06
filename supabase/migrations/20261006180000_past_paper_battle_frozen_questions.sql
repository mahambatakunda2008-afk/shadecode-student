-- Past Paper Battle v1: both players sit the identical frozen question set.
-- Applied to production via MCP on 2026-10-06.
create table if not exists public.exam_result_questions (
  result_id uuid primary key references public.exam_results(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  constraint exam_result_questions_size check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20)
);
alter table public.exam_result_questions enable row level security;
create policy "Users insert own result questions" on public.exam_result_questions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users read own result questions" on public.exam_result_questions
  for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.challenge_questions (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  constraint challenge_questions_size check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20)
);
alter table public.challenge_questions enable row level security;
-- Public read is deliberate: the question set (including the key the exam client already receives) is what both players sit.
create policy "Public read challenge questions" on public.challenge_questions
  for select to anon, authenticated using (true);
create policy "Challenger freezes own questions" on public.challenge_questions
  for insert to authenticated with check (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.challenger_id = (select auth.uid()))
  );
