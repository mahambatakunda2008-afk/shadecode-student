create table if not exists public.curriculum_knowledge (
  id uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete restrict,
  source_document_id uuid references public.curriculum_documents(id) on delete restrict,
  board_id text not null,
  qualification_id text not null,
  level text not null,
  syllabus_id text not null,
  syllabus_version text not null,
  subject_id text not null,
  paper_component_id text,
  kind text not null,
  knowledge_key text,
  title text not null,
  content text not null,
  parent_id uuid references public.curriculum_knowledge(id) on delete restrict,
  topic_key text,
  objective_keys text[] not null default '{}',
  status text not null default 'draft',
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (kind in ('objective','topic','content_scope','competency','learning_outcome','practical_activity','project_requirement','assessment_requirement','paper_component','assessment_weighting','examination_format','terminology','skill','prerequisite','progression','resource','constraint','guidance','note')),
  check (status in ('draft','verified','archived'))
);

create index if not exists curriculum_knowledge_identity_idx
  on public.curriculum_knowledge(board_id, qualification_id, syllabus_id, syllabus_version, subject_id);
create index if not exists curriculum_knowledge_version_idx
  on public.curriculum_knowledge(curriculum_version_id);
create index if not exists curriculum_knowledge_kind_idx
  on public.curriculum_knowledge(kind, status);
create index if not exists curriculum_knowledge_topic_idx
  on public.curriculum_knowledge(topic_key);

alter table public.curriculum_knowledge enable row level security;

create policy "verified curriculum knowledge is readable"
  on public.curriculum_knowledge for select
  using (status = 'verified');

create policy "service role manages curriculum knowledge"
  on public.curriculum_knowledge for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.curriculum_knowledge is 'Whole-syllabus knowledge: topics, scope, competencies, practicals, assessment, terminology, constraints and related curriculum facts. Objectives are one knowledge kind, not the entire model.';
