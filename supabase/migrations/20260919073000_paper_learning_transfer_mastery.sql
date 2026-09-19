create table if not exists public.paper_learning_transfer_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.paper_learning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_block_id text not null,
  question text not null,
  expected_answer text not null,
  rubric text not null,
  expected_concepts jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','graded')),
  response text,
  verdict text check (verdict in ('correct','partially_correct','incorrect')),
  feedback text,
  misconception text,
  next_action text,
  created_at timestamptz not null default now(),
  graded_at timestamptz
);

create index if not exists paper_learning_transfer_session_created_idx
  on public.paper_learning_transfer_questions(session_id, created_at desc);

create index if not exists paper_learning_transfer_user_created_idx
  on public.paper_learning_transfer_questions(user_id, created_at desc);

alter table public.paper_learning_transfer_questions enable row level security;

create policy "paper learning transfer questions are readable by owner"
  on public.paper_learning_transfer_questions for select
  using (auth.uid() = user_id);

create policy "paper learning transfer questions are insertable by owner"
  on public.paper_learning_transfer_questions for insert
  with check (auth.uid() = user_id);

create policy "paper learning transfer questions are updatable by owner"
  on public.paper_learning_transfer_questions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.paper_learning_attempts
  drop constraint if exists paper_learning_attempts_action_check;

alter table public.paper_learning_attempts
  add constraint paper_learning_attempts_action_check
  check (action in ('submit','hint','reveal','transfer-submit'));
