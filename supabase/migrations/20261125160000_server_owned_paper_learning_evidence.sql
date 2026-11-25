-- Restore the paper-learning attempt contract in production and make evidence server-owned.
-- The API authenticates the learner, then writes through the service-role client.
-- Browser clients may read their own attempts but cannot create, alter, or delete graded evidence.

alter table public.paper_learning_attempts
  add column if not exists client_action_id text;

create unique index if not exists paper_learning_attempts_client_action_uidx
  on public.paper_learning_attempts (session_id, user_id, client_action_id)
  where client_action_id is not null;

-- Remove legacy and duplicate owner-write policies. Service-role API writes bypass RLS.
drop policy if exists "paper learning attempts are insertable by owner" on public.paper_learning_attempts;
drop policy if exists "paper_learning_attempts_insert_owner" on public.paper_learning_attempts;
drop policy if exists "paper learning attempts are deletable by owner" on public.paper_learning_attempts;

-- Session contents (pages, source metadata, learning plan) are authoritative server output.
-- The browser must not be able to replace them or fabricate a session.
drop policy if exists "paper learning sessions are insertable by owner" on public.paper_learning_sessions;
drop policy if exists "paper learning sessions are updateable by owner" on public.paper_learning_sessions;

-- Keep owner-scoped SELECT and session DELETE for privacy/self-service cleanup.
