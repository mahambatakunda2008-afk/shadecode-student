-- Curriculum ingestion infrastructure.
-- The initial schema was applied to the production Supabase project during implementation;
-- keep this migration as the reproducible repository definition for future environments.

create extension if not exists pgcrypto;

create table if not exists public.curriculum_sources (
  id text primary key,
  board_id text not null,
  qualification_id text,
  subject_id text,
  level text,
  authority text not null,
  kind text not null check (kind in ('landing-page','pdf','update-page')),
  url text not null unique,
  allowed_domains text[] not null default '{}',
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  discover_linked_documents boolean not null default true,
  extract_text boolean not null default true,
  auto_promote boolean not null default false,
  active boolean not null default true,
  last_checked_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_documents (
  id uuid primary key default gen_random_uuid(), source_id text not null references public.curriculum_sources(id) on delete cascade,
  url text not null unique, title text, content_hash text not null, content_characters integer not null default 0,
  extracted_text text, status text not null default 'discovered' check (status in ('discovered','draft','reviewed','verified','superseded','rejected')),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_versions (
  id uuid primary key default gen_random_uuid(), source_document_id uuid not null references public.curriculum_documents(id) on delete cascade,
  board_id text not null, qualification_id text, syllabus_id text, syllabus_version text, subject_id text,
  effective_from date, effective_to date,
  status text not null default 'draft' check (status in ('discovered','draft','reviewed','verified','superseded','rejected')),
  provenance jsonb not null default '{}'::jsonb, document_hash text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_objectives (
  id uuid primary key default gen_random_uuid(), curriculum_version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  objective_key text not null, parent_key text, topic text, title text not null, description text,
  education_level text, paper_component text,
  status text not null default 'draft' check (status in ('draft','reviewed','verified','superseded','rejected')),
  provenance jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(curriculum_version_id, objective_key)
);

create table if not exists public.objective_skill_mappings (
  id uuid primary key default gen_random_uuid(), objective_id uuid not null references public.curriculum_objectives(id) on delete cascade,
  skill_id text not null, mapping_status text not null default 'draft' check (mapping_status in ('draft','reviewed','verified','rejected')),
  rationale text, provenance jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(objective_id, skill_id)
);

create table if not exists public.curriculum_ingestion_runs (
  id uuid primary key default gen_random_uuid(), source_id text references public.curriculum_sources(id) on delete set null,
  started_at timestamptz not null default now(), completed_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','failed','partial')),
  documents_seen integer not null default 0, documents_changed integer not null default 0,
  objectives_added integer not null default 0, objectives_changed integer not null default 0, objectives_removed integer not null default 0,
  error text, metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.curriculum_ingestion_changes (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.curriculum_ingestion_runs(id) on delete cascade,
  document_id uuid references public.curriculum_documents(id) on delete set null,
  change_type text not null check (change_type in ('document_added','document_changed','document_removed','objective_added','objective_changed','objective_removed','mapping_changed')),
  objective_key text, before_value jsonb, after_value jsonb,
  severity text not null default 'info' check (severity in ('info','warning','breaking','critical')),
  requires_verification boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.curriculum_verification_events (
  id uuid primary key default gen_random_uuid(), curriculum_version_id uuid references public.curriculum_versions(id) on delete cascade,
  objective_id uuid references public.curriculum_objectives(id) on delete cascade,
  action text not null check (action in ('reviewed','verified','rejected','superseded')),
  reviewer_id uuid, notes text, evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists curriculum_documents_source_idx on public.curriculum_documents(source_id);
create index if not exists curriculum_versions_identity_idx on public.curriculum_versions(board_id, qualification_id, syllabus_id, syllabus_version);
create index if not exists curriculum_objectives_version_idx on public.curriculum_objectives(curriculum_version_id);
create index if not exists curriculum_ingestion_changes_run_idx on public.curriculum_ingestion_changes(run_id);

alter table public.curriculum_sources enable row level security;
alter table public.curriculum_documents enable row level security;
alter table public.curriculum_versions enable row level security;
alter table public.curriculum_objectives enable row level security;
alter table public.objective_skill_mappings enable row level security;
alter table public.curriculum_ingestion_runs enable row level security;
alter table public.curriculum_ingestion_changes enable row level security;
alter table public.curriculum_verification_events enable row level security;

create or replace function public.set_curriculum_updated_at() returns trigger
language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

insert into public.curriculum_sources (id, board_id, authority, kind, url, allowed_domains, frequency, discover_linked_documents, extract_text, auto_promote)
values
('zimsec-syllabi','zimsec','Zimbabwe School Examinations Council','landing-page','https://www5.zimsec.co.zw/syllabi/',array['www5.zimsec.co.zw','zimsec.co.zw'],'weekly',true,true,false),
('cambridge-igcse-computer-science-0478','cambridge','Cambridge International','landing-page','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-computer-science-0478/',array['cambridgeinternational.org','www.cambridgeinternational.org'],'weekly',true,true,false),
('cambridge-o-level-computer-science-2210','cambridge','Cambridge International','landing-page','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-o-level-computer-science-2210/',array['cambridgeinternational.org','www.cambridgeinternational.org'],'weekly',true,true,false),
('cambridge-as-a-level-computer-science-9618','cambridge','Cambridge International','landing-page','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/',array['cambridgeinternational.org','www.cambridgeinternational.org'],'weekly',true,true,false)
on conflict (id) do update set url=excluded.url, updated_at=now();
