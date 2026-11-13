create table if not exists public.lesson_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learn_lessons(id) on delete cascade,
  questions jsonb not null check (jsonb_typeof(questions)='array'),
  status text not null default 'issued' check (status in ('issued','completed')),
  answers integer[],
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(id,user_id)
);
create index if not exists lesson_quiz_attempts_user_created_idx on public.lesson_quiz_attempts(user_id,created_at desc);
alter table public.lesson_quiz_attempts enable row level security;
revoke all on public.lesson_quiz_attempts from public,anon,authenticated;
grant select,insert,update,delete on public.lesson_quiz_attempts to service_role;