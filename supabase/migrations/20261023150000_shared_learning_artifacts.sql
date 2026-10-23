-- Generic, server-owned cache for reusable learning artifacts.
-- Only quality-gated educational payloads are stored here. User identity,
-- personal memory, private notes, learner progress and assessment submissions
-- must never be written into this table.
create table if not exists public.shared_learning_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null check (artifact_type ~ '^[a-z][a-z0-9_]{1,47}$'),
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  subject_key text not null,
  topic_key text not null,
  difficulty text,
  level_key text,
  exam_board_key text,
  content_version integer not null default 1 check (content_version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  quality_score integer not null check (quality_score between 0 and 100),
  status text not null default 'verified' check (status in ('verified', 'review', 'retired')),
  use_count bigint not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shared_learning_artifacts_type_key_unique unique (artifact_type, cache_key)
);

create index if not exists shared_learning_artifacts_lookup_idx
  on public.shared_learning_artifacts (artifact_type, subject_key, topic_key)
  where status = 'verified';

create index if not exists shared_learning_artifacts_quality_idx
  on public.shared_learning_artifacts (quality_score desc, use_count desc)
  where status = 'verified';

alter table public.shared_learning_artifacts enable row level security;

-- Cache reads/writes are server-owned. Learner clients cannot enumerate the cache,
-- submit arbitrary payloads, or poison other learners' reusable content.
revoke all on public.shared_learning_artifacts from public, anon, authenticated;
grant all on public.shared_learning_artifacts to service_role;

create or replace function public.touch_shared_learning_artifact_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shared_learning_artifacts_touch_updated_at on public.shared_learning_artifacts;
create trigger shared_learning_artifacts_touch_updated_at
before update on public.shared_learning_artifacts
for each row execute function public.touch_shared_learning_artifact_updated_at();

revoke all on function public.touch_shared_learning_artifact_updated_at() from public, anon, authenticated;
