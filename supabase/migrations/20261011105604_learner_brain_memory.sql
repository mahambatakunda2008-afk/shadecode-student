-- Shadecode Student Learn Brain: private, cross-device learning memory.
-- This stores learning signals, not private chat transcripts or model weights.
create table if not exists public.learner_brain_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  topic text not null default '',
  topic_key text not null default '',
  event_type text not null check (event_type in (
    'request', 'lesson_opened', 'lesson_completed', 'generation_failed', 'checkpoint_answered',
    'help_requested', 'feedback'
  )),
  outcome text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learner_brain_events_user_recent_idx
  on public.learner_brain_events (user_id, created_at desc);
create index if not exists learner_brain_events_user_topic_idx
  on public.learner_brain_events (user_id, topic_key, created_at desc);

alter table public.learner_brain_events enable row level security;

-- Explicit least-privilege Data API grants. Writes are server-side only.
grant select on table public.learner_brain_events to authenticated;
grant all on table public.learner_brain_events to service_role;
grant usage, select on sequence public.learner_brain_events_id_seq to service_role;


drop policy if exists "Learners can read their own brain memory" on public.learner_brain_events;
create policy "Learners can read their own brain memory"
  on public.learner_brain_events for select
  to authenticated using (auth.uid() = user_id);

-- Writes are intentionally server-mediated through the service role so clients
-- cannot forge completion or generation-quality signals.
drop policy if exists "Clients cannot write learner brain memory" on public.learner_brain_events;
create policy "Clients cannot write learner brain memory"
  on public.learner_brain_events for insert
  to authenticated with check (false);

comment on table public.learner_brain_events is
  'Private per-user learning signals used to personalize Learn across signed-in devices. Not used to train shared model weights.';
