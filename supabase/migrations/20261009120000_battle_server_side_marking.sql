-- Server-marked battles. Applied to production via MCP on 2026-10-09.
create table if not exists public.challenge_answer_keys (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  key jsonb not null,
  created_at timestamptz not null default now(),
  constraint challenge_answer_keys_size check (jsonb_typeof(key) = 'array' and jsonb_array_length(key) between 1 and 20)
);
-- RLS on with no policies: only the service role (server routes) can read or write keys.
alter table public.challenge_answer_keys enable row level security;

alter table public.challenge_questions
  add column if not exists marking text not null default 'client'
  check (marking in ('client', 'server'));

alter table public.challenge_attempts
  add column if not exists verified boolean not null default false;
