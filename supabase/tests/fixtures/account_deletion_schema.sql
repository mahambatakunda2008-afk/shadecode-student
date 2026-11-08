-- Disposable, data-free schema for account-deletion migration and execution tests.
-- Never apply this fixture to a hosted or production database.
create extension if not exists pgcrypto;

do $$
declare
  t text;
begin
  foreach t in array array[
    'daily_focus','generated_course_drafts','insights_archive','learning_events',
    'platform_channel_identities','platform_channel_link_codes',
    'platform_channel_message_receipts','revisions','topic_mastery','user_careers',
    'user_cortex',
    'feedback','exam_results','user_roles','ai_anomalies',
    'ai_usage_logs','export_logs','survey_responses','traction_events',
    'challenge_attempts','challenges','academic_contexts','cortex_events',
    'cortex_generation_jobs','cortex_memory','experiment_assignments','focus_sessions',
    'insights','learner_brain_events','learner_curriculum_objective_progress',
    'learning_paths','learning_signals','lesson_votes','paper_learning_attempts',
    'paper_learning_transfer_questions','paper_learning_sessions','platform_group_members',
    'platform_institution_members','primary_activity_progress','project_evidence',
    'project_milestones','projects','revision_queue','study_plans','sync_revisions',
    'user_achievements','user_past_paper_state','user_profiles','user_question_attempts',
    'user_saved_questions'
  ]
  loop
    execute format(
      'create table public.%I (
        id uuid primary key default gen_random_uuid(),
        user_id uuid,
        reviewer_id uuid,
        assigned_by uuid,
        created_by uuid,
        approved_by uuid,
        moderator_id uuid,
        moderator_notes text,
        notes text,
        challenger_id uuid,
        subject_user_id uuid,
        related_user_id uuid,
        reviewed_by uuid,
        channel text,
        external_user_id text,
        source_lesson_id uuid,
        file_path text
      )', t
    );
  end loop;
end $$;

alter table public.user_roles
  add constraint user_roles_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create table public.exam_logs (id uuid primary key default gen_random_uuid(), user_id text);
create table public.learn_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  topic text,
  subject_id uuid,
  difficulty text,
  blocks jsonb,
  progress integer,
  constraint learn_lessons_user_id_auth_users_fkey
    foreign key (user_id) references auth.users(id) on delete cascade
);
create table public.lesson_library (
  id uuid primary key default gen_random_uuid(),
  source_lesson_id uuid unique,
  title text,
  topic text,
  subject text,
  difficulty text,
  blocks jsonb,
  search_text text,
  helpful_up integer not null default 0,
  helpful_down integer not null default 0
);
create table public.community_uploads (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid,
  moderator_id uuid,
  moderator_notes text,
  file_path text
);
create table public.exam_question_topic_proposals (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid,
  notes text
);
create table public.platform_user_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid,
  related_user_id uuid,
  created_by uuid,
  approved_by uuid
);
create table public.published_learning_assets (
  id uuid primary key default gen_random_uuid(),
  reviewed_by uuid
);
create table public.curriculum_verification_events (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid,
  notes text
);
create table public.generated_course_approvals (
  id uuid primary key default gen_random_uuid(),
  approved_by uuid,
  notes jsonb
);

insert into storage.buckets (id, name, public)
values
  ('shadecode-backups','shadecode-backups',false),
  ('community-uploads-pending','community-uploads-pending',false)
on conflict (id) do nothing;
