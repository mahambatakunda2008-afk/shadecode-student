-- Minimal, data-free schema prerequisites for account-deletion migration tests.
-- This is NOT a production migration and must only be loaded into the disposable
-- GitHub Actions Supabase database. The feature migrations are tested against
-- the real Supabase auth/storage schemas plus these FK target tables.
create table public.daily_focus (user_id uuid);
create table public.generated_course_drafts (
  user_id uuid,
  approved_by uuid
);
create table public.insights_archive (user_id uuid);
create table public.learning_events (user_id uuid);
create table public.platform_channel_identities (user_id uuid);
create table public.platform_channel_link_codes (user_id uuid);
create table public.platform_channel_message_receipts (user_id uuid);
create table public.revisions (user_id uuid);
create table public.topic_mastery (user_id uuid);
create table public.user_careers (user_id uuid);
create table public.user_cortex (user_id uuid);
create table public.curriculum_verification_events (reviewer_id uuid);
create table public.generated_course_approvals (
  approved_by uuid not null
);
