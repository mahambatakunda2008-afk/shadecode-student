-- Paper-to-Learning persists resumable learner progress on the session itself.
-- The original session table predates the progress contract used by the API/client.
alter table public.paper_learning_sessions
  add column if not exists progress jsonb not null default '{}'::jsonb;

comment on column public.paper_learning_sessions.progress is
  'Resumable client/session state: completed checkpoint block ids, last block, last verdict, and update timestamp.';
