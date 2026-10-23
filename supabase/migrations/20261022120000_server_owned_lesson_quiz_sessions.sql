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
  -- Save the verified result in the same atomic update that consumes the session.
  -- A lost HTTP response can then be recovered without rescoring or double-counting.
  result_payload jsonb,
  mastery_status text not null default 'not_applicable'
    check (mastery_status in ('not_applicable', 'pending', 'recorded', 'failed')),
  constraint lesson_quiz_sessions_expiry_check check (expires_at > created_at),
  constraint lesson_quiz_sessions_result_check check (submitted_at is null or result_payload is not null)
);

create index if not exists lesson_quiz_sessions_owner_idx
  on public.lesson_quiz_sessions(user_id, lesson_id, created_at desc);

alter table public.lesson_quiz_sessions enable row level security;
-- No client policies: only trusted server code using the service role can read answer keys.
revoke all on public.lesson_quiz_sessions from anon, authenticated;
grant all on public.lesson_quiz_sessions to service_role;
