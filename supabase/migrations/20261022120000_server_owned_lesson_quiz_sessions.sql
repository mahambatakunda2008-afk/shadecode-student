-- Server-owned answer keys for lesson quizzes. The browser receives questions for display,
-- but assessment scoring is based only on this private server-side snapshot.
create table if not exists public.lesson_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learn_lessons(id) on delete cascade,
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  submitted_at timestamptz,
  constraint lesson_quiz_sessions_expiry_check check (expires_at > created_at)
);

create index if not exists lesson_quiz_sessions_owner_idx
  on public.lesson_quiz_sessions(user_id, lesson_id, created_at desc);

alter table public.lesson_quiz_sessions enable row level security;
-- No client policies: only trusted server code using the service role can read answer keys.
revoke all on public.lesson_quiz_sessions from anon, authenticated;
grant all on public.lesson_quiz_sessions to service_role;
