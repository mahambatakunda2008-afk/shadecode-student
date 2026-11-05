-- Read-only contract checks for the account-deletion migrations.
-- Run only after applying the feature-branch migrations to a disposable Supabase DB.
-- This script does not create users, mutate records, or execute deletion functions.

do $$
declare
  v_constraint record;
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
      where conname = v_constraint.column1
        and contype = 'f'
        and confdeltype = v_constraint.column2
        and convalidated
    ) then
      raise exception 'Expected validated FK % with delete action %', v_constraint.column1, v_constraint.column2;
    end if;
  end loop;

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
     or has_function_privilege('authenticated', 'public.claim_account_deletion_request(integer)', 'EXECUTE') then
    raise exception 'claim_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.renew_account_deletion_request(uuid,uuid,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.renew_account_deletion_request(uuid,uuid,integer)', 'EXECUTE') then
    raise exception 'renew_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.release_account_deletion_request(uuid,uuid,text,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.release_account_deletion_request(uuid,uuid,text,boolean)', 'EXECUTE') then
    raise exception 'release_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.complete_account_deletion_request(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.complete_account_deletion_request(uuid,uuid)', 'EXECUTE') then
    raise exception 'complete_account_deletion_request grants are too broad or missing';
  end if;

  if not has_function_privilege('service_role', 'public.recover_completed_account_deletion_requests()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.recover_completed_account_deletion_requests()', 'EXECUTE') then
    raise exception 'recover_completed_account_deletion_requests grants are too broad or missing';
  end if;
end;
$$;
