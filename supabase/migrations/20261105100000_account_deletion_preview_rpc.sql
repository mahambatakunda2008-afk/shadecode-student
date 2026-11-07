-- Read-only account-deletion inventory preview.
-- This RPC returns counts only. It does not mutate user, database, or Storage data.
-- It is intended for a future server-side deletion worker and is service_role-only.

create or replace function public.preview_account_deletion(p_user_id uuid)
returns table (
  resource text,
  identity_column text,
  matching_rows bigint,
  handling text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_count bigint;
begin
  if p_user_id is null then
    raise exception using errcode = '22004', message = 'User ID is required';
  end if;

  for v_item in
    select * from (values
      ('academic_contexts','user_id','delete'),
      ('achievements','user_id','delete'),
      ('ai_anomalies','user_id','delete'),
      ('ai_usage_logs','user_id','delete'),
      ('challenge_attempts','user_id','delete'),
      ('challenges','challenger_id','delete_owned_challenges_and_attempts'),
      ('community_uploads','contributor_id','delete_rows_and_owned_storage_objects'),
      ('community_uploads','moderator_id','clear_attribution'),
      ('cortex_events','user_id','delete'),
      ('cortex_generation_jobs','user_id','delete'),
      ('cortex_insights','user_id','delete'),
      ('cortex_memory','user_id','delete'),
      ('curriculum_verification_events','reviewer_id','anonymize_attribution_and_review_evidence'),
      ('daily_focus','user_id','delete'),
      ('exam_logs','user_id','delete_text_uuid_matches'),
      ('exam_question_topic_proposals','reviewer_id','clear_attribution_before_auth_delete'),
      ('exam_result_questions','user_id','delete'),
      ('exam_results','user_id','delete_before_auth_delete'),
      ('exams','user_id','delete'),
      ('experiment_assignments','user_id','delete'),
      ('export_logs','user_id','delete_or_anonymize'),
      ('feedback','user_id','delete_before_auth_delete'),
      ('focus_sessions','user_id','delete'),
      ('generated_course_approvals','approved_by','clear_or_delete_owned_approval'),
      ('generated_course_drafts','user_id','delete'),
      ('generated_course_drafts','approved_by','clear_attribution'),
      ('generated_lessons','user_id','delete'),
      ('insights','user_id','delete'),
      ('insights_archive','user_id','delete'),
      ('learn_lessons','user_id','delete'),
      ('learner_brain_events','user_id','delete'),
      ('learner_curriculum_objective_progress','user_id','delete'),
      ('learning_events','user_id','delete'),
      ('learning_paths','user_id','delete'),
      ('learning_signals','user_id','delete'),
      ('lesson_votes','user_id','delete'),
      ('paper_learning_attempts','user_id','delete'),
      ('paper_learning_sessions','user_id','delete'),
      ('paper_learning_transfer_questions','user_id','delete'),
      ('platform_channel_identities','user_id','delete_external_identity_link'),
      ('platform_channel_link_codes','user_id','delete'),
      ('platform_channel_message_receipts','user_id','delete_and_correlate_external_ids'),
      ('platform_group_members','user_id','delete'),
      ('platform_institution_members','user_id','delete'),
      ('platform_user_relationships','subject_user_id','delete_relationship'),
      ('platform_user_relationships','related_user_id','delete_relationship'),
      ('platform_user_relationships','created_by','clear_attribution'),
      ('platform_user_relationships','approved_by','clear_attribution'),
      ('primary_activity_progress','user_id','delete'),
      ('profiles','id','delete'),
      ('project_evidence','user_id','delete'),
      ('project_milestones','user_id','delete'),
      ('projects','user_id','delete'),
      ('published_learning_assets','reviewed_by','clear_attribution'),
      ('revision_queue','user_id','delete'),
      ('revisions','user_id','delete'),
      ('study_plans','user_id','delete'),
      ('study_topics','user_id','delete'),
      ('subjects','user_id','delete'),
      ('survey_responses','user_id','delete_or_anonymize'),
      ('sync_revisions','user_id','delete'),
      ('tasks','user_id','delete'),
      ('timetable','user_id','delete'),
      ('topic_mastery','user_id','delete'),
      ('traction_events','user_id','delete_or_anonymize'),
      ('user_achievements','user_id','delete'),
      ('user_careers','user_id','delete'),
      ('user_cortex','user_id','delete'),
      ('user_past_paper_state','user_id','delete'),
      ('user_profiles','user_id','delete'),
      ('user_question_attempts','user_id','delete'),
      ('user_roles','user_id','delete_owned_roles'),
      ('user_roles','assigned_by','clear_attribution_before_auth_delete'),
      ('user_saved_questions','user_id','delete')
    ) as items(table_name,column_name,handling)
  loop
    execute pg_catalog.format(
      'select count(*)::bigint from public.%I where %I::text = $1',
      v_item.table_name, v_item.column_name
    )
    into v_count
    using p_user_id::text;

    resource := v_item.table_name;
    identity_column := v_item.column_name;
    matching_rows := coalesce(v_count, 0);
    handling := v_item.handling;
    return next;
  end loop;

  -- Lesson library is shared content with a non-FK source_lesson_id. Count it
  -- by joining through the learner-owned source lessons; never infer ownership
  -- from a free-standing UUID match.
  select count(*)::bigint into v_count
  from public.lesson_library ll
  join public.learn_lessons l on l.id = ll.source_lesson_id
  where l.user_id = p_user_id;
  resource := 'lesson_library';
  identity_column := 'source_lesson_id via learn_lessons.user_id';
  matching_rows := coalesce(v_count, 0);
  handling := 'review_shared_copy_before_delete';
  return next;


  -- Receipts may have lost their Auth user_id after an earlier account unlink.
  -- Correlate only through the still-existing channel identity mapping.
  select count(*)::bigint into v_count
  from public.platform_channel_message_receipts r
  where r.user_id is null
    and exists (
      select 1
      from public.platform_channel_identities i
      where i.user_id = p_user_id
        and i.channel = r.channel
        and i.external_user_id = r.external_user_id
    );
  resource := 'platform_channel_message_receipts';
  identity_column := 'external_user_id via platform_channel_identities (unlinked receipts)';
  matching_rows := coalesce(v_count, 0);
  handling := 'delete_correlated_receipts_before_removing_channel_identity';
  return next;

  -- Storage object counts are prefix-scoped. These are previews only; the
  -- worker must use the Storage API and verify exact object ownership.
  select count(*)::bigint into v_count
  from storage.objects
  where bucket_id = 'shadecode-backups'
    and name like p_user_id::text || '/%';
  resource := 'storage.objects';
  identity_column := 'shadecode-backups/' || p_user_id::text || '/';
  matching_rows := coalesce(v_count, 0);
  handling := 'delete_exact_user_prefix_via_storage_api';
  return next;

  select count(*)::bigint into v_count
  from storage.objects
  where bucket_id = 'community-uploads-pending'
    and name like p_user_id::text || '/%';
  resource := 'storage.objects';
  identity_column := 'community-uploads-pending/' || p_user_id::text || '/';
  matching_rows := coalesce(v_count, 0);
  handling := 'delete_pending_user_uploads_only_preserve_past_papers';
  return next;
end;
$$;

revoke all on function public.preview_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.preview_account_deletion(uuid) to service_role;

comment on function public.preview_account_deletion(uuid) is
  'Read-only service-role-only inventory of account-linked row and Storage object counts. Does not delete or modify any data.';
