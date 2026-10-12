-- Learning signals: an append-only record of what learners did with content, so the platform can learn
-- which question types are hard and which mistakes are common. Applied to production via MCP on 2026-10-10.
create table if not exists public.learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('question', 'deck', 'quiz', 'battle', 'selfcheck')),
  source text not null check (source in ('engine', 'ai', 'curated', 'library', 'deck', 'selfcheck')),
  item_key text,
  syllabus_id text,
  topic_key text,
  correct boolean,
  score numeric,
  mistake_id text,
  time_spent_seconds integer check (time_spent_seconds is null or time_spent_seconds between 0 and 86400),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists learning_signals_item_idx on public.learning_signals (item_key, created_at desc);
create index if not exists learning_signals_user_idx on public.learning_signals (user_id, created_at desc);
create index if not exists learning_signals_topic_idx on public.learning_signals (syllabus_id, topic_key) where topic_key is not null;
alter table public.learning_signals enable row level security;
create policy "Users insert own signals" on public.learning_signals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users read own signals" on public.learning_signals for select to authenticated using ((select auth.uid()) = user_id);

create or replace view public.learning_item_stats as
select item_key, min(syllabus_id) as syllabus_id, min(topic_key) as topic_key, count(*) as attempts,
  count(distinct user_id) as learners,
  round(100.0 * avg(case when correct then 1 else 0 end) filter (where correct is not null), 1) as percent_correct,
  round(avg(time_spent_seconds) filter (where time_spent_seconds is not null), 1) as avg_seconds,
  max(created_at) as last_seen
from public.learning_signals where item_key is not null and kind = 'question' group by item_key;

create or replace view public.learning_mistake_stats as
select item_key, mistake_id, count(*) as times, count(distinct user_id) as learners
from public.learning_signals where mistake_id is not null group by item_key, mistake_id;

revoke all on public.learning_item_stats from anon, authenticated;
revoke all on public.learning_mistake_stats from anon, authenticated;
grant select on public.learning_item_stats to service_role;
grant select on public.learning_mistake_stats to service_role;
