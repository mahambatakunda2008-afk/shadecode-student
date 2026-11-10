-- Transactional database phase of account deletion.
-- Storage objects must be removed first using account_deletion_storage_manifest().
-- This function deliberately does NOT delete auth.users; the worker must do that
-- last through Supabase Auth Admin, then complete the queue request.

create or replace function public.execute_account_deletion_cleanup(p_request_id uuid, p_lease_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_count bigint;
  v_user_id uuid;
begin
  if p_request_id is null or p_lease_token is null then
    raise exception using errcode = '22004', message = 'Request ID and lease token are required';
  end if;

  select r.user_id into v_user_id
    from public.account_deletion_requests r
   where r.id = p_request_id
     and r.status = 'processing'
     and r.lease_token = p_lease_token
     and r.lease_expires_at > now()
   for update;

  if v_user_id is null then
    raise exception using errcode = '42501', message = 'A valid active deletion lease is required';
  end if;

  if not exists (select 1 from auth.users u where u.id = v_user_id) then
    raise exception using errcode = 'P0002', message = 'Account no longer exists';
  end if;

  -- Remove user-authored/shared-link records before their parent source rows.
  delete from public.lesson_library ll
   where ll.source_lesson_id in (
     select l.id from public.learn_lessons l where l.user_id = v_user_id
   );
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('lesson_library', v_count);

  -- learn_lessons has no Auth FK in the audited schema, so it must be
  -- explicitly removed after its derived shared-library rows are handled.
  delete from public.learn_lessons where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learn_lessons', v_count);

  -- Resolve all user-linked channel receipts before deleting the identity map.
  delete from public.platform_channel_message_receipts r
   where r.user_id = v_user_id
      or exists (
        select 1
          from public.platform_channel_identities i
         where i.user_id = v_user_id
           and i.channel = r.channel
           and i.external_user_id = r.external_user_id
      );
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_channel_message_receipts', v_count);

  -- NO ACTION Auth FKs: remove user-owned records or clear attribution on
  -- records that belong to other users before Auth deletion.
  delete from public.feedback where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('feedback', v_count);

  delete from public.exam_results where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('exam_results', v_count);

  update public.exam_question_topic_proposals
     set reviewer_id = null
   where reviewer_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('exam_question_topic_proposals_reviewer_cleared', v_count);

  -- Remove roles owned by the deleted account, then preserve other users' roles
  -- while clearing this account's assignment attribution.
  delete from public.user_roles where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_roles_deleted', v_count);

  update public.user_roles
     set assigned_by = null
   where assigned_by = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_roles_assigner_cleared', v_count);

  -- Preserve other people's records while removing this account's attribution.
  update public.platform_user_relationships
     set created_by = case when created_by = v_user_id then null else created_by end,
         approved_by = case when approved_by = v_user_id then null else approved_by end
   where created_by = v_user_id or approved_by = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_relationship_attribution_cleared', v_count);

  update public.community_uploads
     set moderator_id = null,
         moderator_notes = null
   where moderator_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('community_upload_moderator_cleared', v_count);

  update public.generated_course_drafts
     set approved_by = null
   where approved_by = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('course_draft_approver_cleared', v_count);

  update public.generated_course_approvals
     set approved_by = null,
         notes = null
   where approved_by = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('course_approval_approver_cleared', v_count);

  update public.published_learning_assets
     set reviewed_by = null
   where reviewed_by = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('published_asset_reviewer_cleared', v_count);

  update public.curriculum_verification_events
     set reviewer_id = null,
         notes = null
   where reviewer_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('curriculum_reviewer_cleared', v_count);

  -- FK SET NULL rows that still contain account-owned data are explicitly
  -- deleted rather than left behind as unattributed records.
  delete from public.ai_anomalies where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('ai_anomalies', v_count);

  delete from public.ai_usage_logs where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('ai_usage_logs', v_count);

  delete from public.export_logs where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('export_logs', v_count);

  delete from public.survey_responses where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('survey_responses', v_count);

  delete from public.traction_events where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('traction_events', v_count);

  -- Records with display-name fields must be deleted before Auth SET NULL.
  delete from public.challenge_attempts where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('challenge_attempts', v_count);

  delete from public.challenges where challenger_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('challenges', v_count);

  -- Tables without Auth FKs are explicitly cleaned. Some also receive new
  -- cascade FKs in the companion migration; explicit deletes keep this phase
  -- auditable and safe if migrations are applied in a different order.
  delete from public.daily_focus where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('daily_focus', v_count);

  delete from public.exam_logs where user_id = v_user_id::text;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('exam_logs', v_count);

  delete from public.generated_course_drafts where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('generated_course_drafts', v_count);

  delete from public.insights_archive where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('insights_archive', v_count);

  delete from public.learning_events where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learning_events', v_count);

  delete from public.platform_channel_link_codes where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_channel_link_codes', v_count);

  delete from public.platform_channel_identities where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_channel_identities', v_count);

  delete from public.revisions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('revisions', v_count);

  delete from public.topic_mastery where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('topic_mastery', v_count);

  delete from public.user_careers where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_careers', v_count);

  delete from public.user_cortex where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_cortex', v_count);

  -- Explicitly remove account-owned rows from tables without an Auth FK.
  -- Their data would otherwise survive deletion of auth.users.
  delete from public.academic_contexts where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('academic_contexts', v_count);

  delete from public.cortex_events where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('cortex_events', v_count);

  delete from public.cortex_generation_jobs where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('cortex_generation_jobs', v_count);

  delete from public.cortex_memory where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('cortex_memory', v_count);

  delete from public.experiment_assignments where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('experiment_assignments', v_count);

  delete from public.focus_sessions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('focus_sessions', v_count);

  delete from public.insights where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('insights', v_count);

  delete from public.learner_brain_events where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learner_brain_events', v_count);

  delete from public.learner_curriculum_objective_progress where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learner_curriculum_objective_progress', v_count);

  delete from public.learning_paths where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learning_paths', v_count);

  delete from public.learning_signals where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('learning_signals', v_count);

  delete from public.lesson_votes where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('lesson_votes', v_count);

  delete from public.paper_learning_attempts where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('paper_learning_attempts', v_count);

  delete from public.paper_learning_transfer_questions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('paper_learning_transfer_questions', v_count);

  delete from public.paper_learning_sessions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('paper_learning_sessions', v_count);

  delete from public.platform_group_members where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_group_members', v_count);

  delete from public.platform_institution_members where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_institution_members', v_count);

  delete from public.primary_activity_progress where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('primary_activity_progress', v_count);

  delete from public.project_evidence where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('project_evidence', v_count);

  delete from public.project_milestones where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('project_milestones', v_count);

  delete from public.projects where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('projects', v_count);

  delete from public.revision_queue where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('revision_queue', v_count);

  delete from public.study_plans where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('study_plans', v_count);

  delete from public.sync_revisions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('sync_revisions', v_count);

  delete from public.user_achievements where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_achievements', v_count);

  delete from public.user_past_paper_state where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_past_paper_state', v_count);

  delete from public.user_profiles where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_profiles', v_count);

  delete from public.user_question_attempts where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_question_attempts', v_count);

  delete from public.user_saved_questions where user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('user_saved_questions', v_count);

  -- Delete account-owned relationships. Cascading Auth FKs remove the
  -- remaining account-owned learning, exam, project, profile and Cortex rows.
  delete from public.platform_user_relationships
   where subject_user_id = v_user_id or related_user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('platform_user_relationships', v_count);

  delete from public.community_uploads where contributor_id = v_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || jsonb_build_object('community_uploads', v_count);

  return jsonb_build_object(
    'user_id', v_user_id,
    'database_cleanup', 'completed',
    'deleted_or_anonymized_counts', v_counts,
    'auth_user_deleted', false,
    'storage_cleanup_required_before_call', true
  );
end;
$$;

revoke all on function public.execute_account_deletion_cleanup(uuid, uuid) from public, anon, authenticated;
grant execute on function public.execute_account_deletion_cleanup(uuid, uuid) to service_role;

comment on function public.execute_account_deletion_cleanup(uuid, uuid) is
  'Transactional database cleanup for the account attached to a valid active request lease. Storage must be removed first. Auth user deletion is intentionally left to the worker as the final step.';
