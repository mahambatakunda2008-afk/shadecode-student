-- Canonical, syllabus-linked learning assets, separate from learner-generated/shared lessons.
-- Published assets require explicit curriculum identity and an explicit review/publish decision.
create table if not exists public.published_learning_assets (
  id uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete restrict,
  asset_key text not null,
  asset_version integer not null default 1 check (asset_version > 0),
  asset_type text not null check (asset_type in ('lesson','worked_example','diagram_task','graph_task','experiment','practice_set','answer_key','revision_sheet','exam_strategy')),
  title text not null check (length(trim(title)) > 0),
  subject_id text not null,
  topic_key text not null check (length(trim(topic_key)) > 0),
  objective_keys text[] not null default '{}',
  content jsonb not null check (jsonb_typeof(content) in ('object','array')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  quality_checks jsonb not null default '{}'::jsonb check (jsonb_typeof(quality_checks) = 'object'),
  review_status text not null default 'draft' check (review_status in ('draft','in_review','approved','rejected','retired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curriculum_version_id, asset_key, asset_version),
  check (
    (review_status = 'approved' and reviewed_at is not null and published_at is not null)
    or review_status <> 'approved'
  )
);

create index if not exists published_learning_assets_curriculum_topic_idx
  on public.published_learning_assets (curriculum_version_id, topic_key)
  where review_status = 'approved';

create index if not exists published_learning_assets_subject_status_idx
  on public.published_learning_assets (subject_id, review_status);

create index if not exists published_learning_assets_objective_keys_idx
  on public.published_learning_assets using gin (objective_keys);

alter table public.published_learning_assets enable row level security;

drop policy if exists "Anyone can read approved published learning assets" on public.published_learning_assets;
create policy "Anyone can read approved published learning assets"
  on public.published_learning_assets
  for select
  to anon, authenticated
  using (review_status = 'approved' and published_at is not null);

-- No anon/authenticated write policies are created. Publishing and review must use a trusted server-side workflow.
