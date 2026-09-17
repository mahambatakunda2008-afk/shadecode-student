create table if not exists public.paper_learning_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.paper_learning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id text not null,
  attempt_no integer not null default 1,
  action text not null check (action in ('submit','hint','reveal')),
  response text,
  verdict text not null default 'not_graded' check (verdict in ('correct','partially_correct','incorrect','not_graded')),
  feedback text,
  misconception text,
  next_action text,
  created_at timestamptz not null default now()
);

create index if not exists paper_learning_attempts_session_created_idx
  on public.paper_learning_attempts(session_id, created_at asc);

create index if not exists paper_learning_attempts_user_created_idx
  on public.paper_learning_attempts(user_id, created_at desc);

alter table public.paper_learning_attempts enable row level security;

create policy "paper learning attempts are readable by owner"
  on public.paper_learning_attempts for select
  using (auth.uid() = user_id);

create policy "paper learning attempts are insertable by owner"
  on public.paper_learning_attempts for insert
  with check (auth.uid() = user_id);

create policy "paper learning attempts are deletable by owner"
  on public.paper_learning_attempts for delete
  using (auth.uid() = user_id);
