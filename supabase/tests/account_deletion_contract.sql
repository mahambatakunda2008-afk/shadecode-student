-- Read-only contract checks for the account-deletion migrations.
-- Run only after applying the feature-branch migrations to a disposable Supabase DB.
-- This script does not create users, mutate records, or execute deletion functions.

do $$
declare
  v_constraint record;
  v_table_name text;
  v_cleanup_definition text;
  v_storage_definition text;
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'account_deletion_requests'
      and c.relrowsecurity
  ) then
    raise exception 'account_deletion_requests must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.account_deletion_requests', 'SELECT')
     or has_table_privilege('authenticated', 'public.account_deletion_requests', 'SELECT') then
    raise exception 'browser roles must not read account_deletion_requests directly';
  end if;

  for v_constraint in
    select * from (values
      ('daily_focus_user_id_auth_users_fkey', 'c'),
      ('generated_course_drafts_user_id_auth_users_fkey', 'c'),
      ('insights_archive_user_id_auth_users_fkey', 'c'),
      ('learning_events_user_id_auth_users_fkey', 'c'),
      ('platform_channel_identities_user_id_auth_users_fkey', 'c'),
      ('platform_channel_link_codes_user_id_auth_users_fkey', 'c'),
      ('platform_channel_message_receipts_user_id_auth_users_fkey', 'c'),
      ('revisions_user_id_auth_users_fkey', 'c'),
      ('topic_mastery_user_id_auth_users_fkey', 'c'),
      ('user_careers_user_id_auth_users_fkey', 'c'),
      ('user_cortex_user_id_auth_users_fkey', 'c'),
      ('curriculum_verification_events_reviewer_id_auth_users_fkey', 'n'),
      ('generated_course_drafts_approved_by_auth_users_fkey', 'n'),
      ('generated_course_approvals_approved_by_auth_users_fkey', 'n')
    ) as expected(constraint_name, delete_action)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = v_constraint.constraint_name
        and contype = 'f'
        and confdeltype = v_constraint.delete_action
        and convalidated
    ) then
      raise exception 'Expected validated FK % with delete action %', v_constraint.constraint_name, v_constraint.delete_action;
    end if;
  end loop;

  -- Guard the manually maintained cleanup inventory against accidental
  -- omissions. Cascading profile/Auth-owned tables are verified by FK checks;
  -- these tables require explicit cleanup in the transactional RPC.
  select lower(pg_get_functiondef(
    'public.execute_account_deletion_cleanup(uuid,uuid)'::regprocedure
  )) into v_cleanup_definition;

  for v_table_name in
    select name from (values
      ('ai_anomalies'),
      ('ai_usage_logs'),
      ('academic_contexts'),
      ('challenge_attempts'),
      ('challenges'),
      ('community_uploads'),
      ('cortex_events'),
      ('cortex_generation_jobs'),
      ('cortex_memory'),
      ('daily_focus'),
      ('exam_logs'),
      ('exam_results'),
      ('export_logs'),
      ('experiment_assignments'),
      ('feedback'),
      ('focus_sessions'),
      ('generated_course_drafts'),
      ('insights'),
      ('insights_archive'),
      ('learner_brain_events'),
      ('learner_curriculum_objective_progress'),
      ('learning_events'),
      ('learning_paths'),
      ('learning_signals'),
      ('lesson_library'),
      ('learn_lessons'),
      ('lesson_votes'),
      ('paper_learning_attempts'),
      ('paper_learning_sessions'),
      ('paper_learning_transfer_questions'),
      ('platform_channel_identities'),
      ('platform_channel_link_codes'),
      ('platform_channel_message_receipts'),
      ('platform_group_members'),
      ('platform_institution_members'),
      ('platform_user_relationships'),
      ('primary_activity_progress'),
      ('project_evidence'),
      ('project_milestones'),
      ('projects'),
      ('revision_queue'),
      ('revisions'),
      ('study_plans'),
      ('sync_revisions'),
      ('topic_mastery'),
      ('traction_events'),
      ('user_achievements'),
      ('user_careers'),
      ('user_cortex'),
      ('user_past_paper_state'),
      ('user_profiles'),
      ('user_question_attempts'),
      ('user_saved_questions')
    ) expected(name)
  loop
    if position('public.' || v_table_name in v_cleanup_definition) = 0 then
      raise exception 'Cleanup RPC is missing expected account-linked table: %', v_table_name;
    end if;
  end loop;

  -- These are attribution fields on records that may belong to other users.
  -- They must be cleared, not used as a reason to delete another user's row.
  for v_table_name in
    select name from (values
      ('exam_question_topic_proposals'),
      ('user_roles'),
      ('platform_user_relationships'),
      ('community_uploads'),
      ('generated_course_drafts'),
      ('generated_course_approvals'),
      ('published_learning_assets'),
      ('curriculum_verification_events')
    ) expected(name)
  loop
    if position('update public.' || v_table_name in v_cleanup_definition) = 0 then
      raise exception 'Cleanup RPC is missing attribution-preservation update for: %', v_table_name;
    end if;
  end loop;

  select lower(pg_get_functiondef(
    'public.account_deletion_storage_manifest(uuid)'::regprocedure
  )) into v_storage_definition;

  if position('other_upload.contributor_id is distinct from p_user_id' in v_storage_definition) = 0 then
    raise exception 'Storage manifest must preserve objects referenced by another contributor';
  end if;

  if not has_function_privilege('authenticated', 'public.account_deletion_is_pending()', 'EXECUTE')
     or has_function_privilege('anon', 'public.account_deletion_is_pending()', 'EXECUTE') then
    raise exception 'account_deletion_is_pending grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.preview_account_deletion(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.preview_account_deletion(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.preview_account_deletion(uuid)', 'EXECUTE') then
    raise exception 'preview_account_deletion grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.account_deletion_storage_manifest(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.account_deletion_storage_manifest(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.account_deletion_storage_manifest(uuid)', 'EXECUTE') then
    raise exception 'account_deletion_storage_manifest grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.execute_account_deletion_cleanup(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.execute_account_deletion_cleanup(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.execute_account_deletion_cleanup(uuid,uuid)', 'EXECUTE') then
    raise exception 'execute_account_deletion_cleanup grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.claim_account_deletion_request(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_account_deletion_request(integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_account_deletion_request(integer)', 'EXECUTE') then
    raise exception 'claim_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.renew_account_deletion_request(uuid,uuid,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.renew_account_deletion_request(uuid,uuid,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.renew_account_deletion_request(uuid,uuid,integer)', 'EXECUTE') then
    raise exception 'renew_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.release_account_deletion_request(uuid,uuid,text,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.release_account_deletion_request(uuid,uuid,text,boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.release_account_deletion_request(uuid,uuid,text,boolean)', 'EXECUTE') then
    raise exception 'release_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.complete_account_deletion_request(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.complete_account_deletion_request(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.complete_account_deletion_request(uuid,uuid)', 'EXECUTE') then
    raise exception 'complete_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.recover_completed_account_deletion_requests()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.recover_completed_account_deletion_requests()', 'EXECUTE')
     or has_function_privilege('anon', 'public.recover_completed_account_deletion_requests()', 'EXECUTE') then
    raise exception 'recover_completed_account_deletion_requests grants are too broad or missing';
  end if;
end;
$$;
