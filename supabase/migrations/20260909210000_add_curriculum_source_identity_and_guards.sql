alter table public.curriculum_sources
  add column if not exists syllabus_id text,
  add column if not exists syllabus_version text;

create index if not exists curriculum_sources_identity_idx
  on public.curriculum_sources (board_id, qualification_id, subject_id, level, syllabus_id, syllabus_version);

alter table public.curriculum_sources drop constraint if exists curriculum_sources_status_check;
alter table public.curriculum_sources add constraint curriculum_sources_status_check
  check (last_status is null or last_status in ('ok','failed'));

alter table public.curriculum_documents drop constraint if exists curriculum_documents_status_check;
alter table public.curriculum_documents add constraint curriculum_documents_status_check
  check (status in ('discovered','draft','verified','archived'));

alter table public.curriculum_versions drop constraint if exists curriculum_versions_status_check;
alter table public.curriculum_versions add constraint curriculum_versions_status_check
  check (status in ('draft','verified','archived'));

alter table public.curriculum_objectives drop constraint if exists curriculum_objectives_status_check;
alter table public.curriculum_objectives add constraint curriculum_objectives_status_check
  check (status in ('draft','verified','archived'));

alter table public.objective_skill_mappings drop constraint if exists objective_skill_mappings_status_check;
alter table public.objective_skill_mappings add constraint objective_skill_mappings_status_check
  check (mapping_status in ('draft','verified'));

alter table public.curriculum_ingestion_runs drop constraint if exists curriculum_ingestion_runs_status_check;
alter table public.curriculum_ingestion_runs add constraint curriculum_ingestion_runs_status_check
  check (status in ('running','completed','failed'));

alter table public.curriculum_ingestion_changes drop constraint if exists curriculum_ingestion_changes_type_check;
alter table public.curriculum_ingestion_changes add constraint curriculum_ingestion_changes_type_check
  check (change_type in ('document_added','document_changed','objective_added','objective_changed','objective_removed'));

alter table public.curriculum_verification_events drop constraint if exists curriculum_verification_events_action_check;
alter table public.curriculum_verification_events add constraint curriculum_verification_events_action_check
  check (action in ('verify_version','archive_version','verify_objective','archive_objective','verify_mapping','reject_change'));

comment on column public.curriculum_sources.syllabus_id is 'Stable syllabus identifier resolved by the source registry.';
comment on column public.curriculum_sources.syllabus_version is 'Immutable syllabus version label resolved by the source registry.';
