-- Add referential integrity to account-linked columns that were missing Auth FKs.
-- Live orphan checks on 2026-11-05 returned zero for every column below.
-- Constraints are added NOT VALID first, then validated; future writes are enforced
-- immediately, while validation checks existing rows before this migration completes.

alter table public.daily_focus
  add constraint daily_focus_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.daily_focus
  validate constraint daily_focus_user_id_auth_users_fkey;

alter table public.generated_course_drafts
  add constraint generated_course_drafts_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.generated_course_drafts
  validate constraint generated_course_drafts_user_id_auth_users_fkey;

alter table public.insights_archive
  add constraint insights_archive_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.insights_archive
  validate constraint insights_archive_user_id_auth_users_fkey;

alter table public.learning_events
  add constraint learning_events_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.learning_events
  validate constraint learning_events_user_id_auth_users_fkey;

alter table public.platform_channel_identities
  add constraint platform_channel_identities_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.platform_channel_identities
  validate constraint platform_channel_identities_user_id_auth_users_fkey;

alter table public.platform_channel_link_codes
  add constraint platform_channel_link_codes_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.platform_channel_link_codes
  validate constraint platform_channel_link_codes_user_id_auth_users_fkey;

alter table public.platform_channel_message_receipts
  add constraint platform_channel_message_receipts_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.platform_channel_message_receipts
  validate constraint platform_channel_message_receipts_user_id_auth_users_fkey;

alter table public.revisions
  add constraint revisions_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.revisions
  validate constraint revisions_user_id_auth_users_fkey;

alter table public.topic_mastery
  add constraint topic_mastery_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.topic_mastery
  validate constraint topic_mastery_user_id_auth_users_fkey;

alter table public.user_careers
  add constraint user_careers_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.user_careers
  validate constraint user_careers_user_id_auth_users_fkey;

alter table public.user_cortex
  add constraint user_cortex_user_id_auth_users_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.user_cortex
  validate constraint user_cortex_user_id_auth_users_fkey;

-- These are attribution references, not ownership. Preserve the reviewed
-- curriculum/draft record but remove the deleted account's reviewer identity.
alter table public.curriculum_verification_events
  add constraint curriculum_verification_events_reviewer_id_auth_users_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null not valid;
alter table public.curriculum_verification_events
  validate constraint curriculum_verification_events_reviewer_id_auth_users_fkey;

alter table public.generated_course_drafts
  add constraint generated_course_drafts_approved_by_auth_users_fkey
  foreign key (approved_by) references auth.users(id) on delete set null not valid;
alter table public.generated_course_drafts
  validate constraint generated_course_drafts_approved_by_auth_users_fkey;

-- Existing approval records may belong to another user's draft. Keep the
-- approval record and its notes, but make approver attribution nullable.
alter table public.generated_course_approvals
  alter column approved_by drop not null;
alter table public.generated_course_approvals
  add constraint generated_course_approvals_approved_by_auth_users_fkey
  foreign key (approved_by) references auth.users(id) on delete set null not valid;
alter table public.generated_course_approvals
  validate constraint generated_course_approvals_approved_by_auth_users_fkey;

comment on constraint generated_course_approvals_approved_by_auth_users_fkey
  on public.generated_course_approvals is
  'Preserves approval history while removing a deleted account as approver.';
