-- Run only in a disposable Supabase test database after the atomic approval migration.
-- Exercises transaction rollback, owner-scoped writes, institution authorization and replay idempotency.
begin;

create function public.test_atomic_course_approval_fail_audit()
returns trigger language plpgsql as $fn$
begin
  if current_setting('app.test_fail_course_audit', true) = 'on' then
    raise exception 'injected course approval audit failure';
  end if;
  return new;
end;
$fn$;

create function public.test_atomic_course_approval_fail_status()
returns trigger language plpgsql as $fn$
begin
  if new.status = 'approved' and current_setting('app.test_fail_course_status', true) = 'on' then
    raise exception 'injected course draft status update failure';
  end if;
  return new;
end;
$fn$;

create trigger test_atomic_course_approval_audit_failure
before insert on public.generated_course_approvals
for each row execute function public.test_atomic_course_approval_fail_audit();

create trigger test_atomic_course_approval_status_failure
before update of status on public.generated_course_drafts
for each row execute function public.test_atomic_course_approval_fail_status();

do $test$
declare
  v_admin uuid;
  v_moderator uuid;
  v_nonmember uuid;
  v_owner uuid;
  v_no_permission uuid;
  v_institution uuid;
  v_global_draft uuid;
  v_permission_denied_draft uuid;
  v_scoped_draft uuid;
  v_rollback_draft uuid;
  v_unknown_prereq_draft uuid;
  v_forward_prereq_draft uuid;
  v_denied_draft uuid;
  v_unscoped_draft uuid;
  v_owner_mismatch_draft uuid;
  v_audit_failure_draft uuid;
  v_status_failure_draft uuid;
  v_global_result jsonb;
  v_retry_result jsonb;
  v_approval_count integer;
  v_lesson_count integer;
  v_prerequisite_count integer;
  v_denied boolean := false;
  v_permission_denied boolean := false;
  v_unscoped_denied boolean := false;
  v_owner_mismatch_denied boolean := false;
  v_rollback boolean := false;
  v_unknown_prereq_failed boolean := false;
  v_forward_prereq_failed boolean := false;
  v_audit_failed boolean := false;
  v_status_failed boolean := false;
  v_subject_name text;
begin
  select ur.user_id into v_admin
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where r.name = 'admin'
     and r.permissions->>'approve_drafts' = 'true'
   limit 1;

  if v_admin is null then
    raise exception 'Missing global admin fixture';
  end if;

  select p.id into v_moderator
    from public.profiles p
   where p.id <> v_admin
     and not exists (
       select 1 from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where ur.user_id = p.id and r.permissions->>'approve_drafts' = 'true'
     )
   order by p.id
   limit 1;

  select p.id into v_nonmember
    from public.profiles p
   where p.id not in (v_admin, v_moderator)
   order by p.id
   limit 1;

  select p.id into v_owner
    from public.profiles p
   where p.id not in (v_admin, v_moderator, v_nonmember)
   order by p.id
   limit 1;

  select p.id into v_no_permission
    from public.profiles p
   where p.id not in (v_admin, v_moderator, v_nonmember, v_owner)
     and not exists (
       select 1 from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       where ur.user_id = p.id and r.permissions->>'approve_drafts' = 'true'
     )
   order by p.id
   limit 1;

  if v_moderator is null or v_nonmember is null or v_owner is null or v_no_permission is null then
    raise exception 'Missing distinct profile fixtures for approval tests';
  end if;

  if has_function_privilege('anon', 'public.approve_generated_course_draft(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.approve_generated_course_draft(uuid,uuid)', 'EXECUTE') then
    raise exception 'Public or authenticated role can execute the privileged approval RPC';
  end if;
  if not has_function_privilege('service_role', 'public.approve_generated_course_draft(uuid,uuid)', 'EXECUTE') then
    raise exception 'service_role cannot execute the approval RPC';
  end if;

  insert into public.user_roles (user_id, role_id)
  select v_moderator, id from public.roles where name = 'moderator'
  on conflict (user_id, role_id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select v_nonmember, id from public.roles where name = 'moderator'
  on conflict (user_id, role_id) do nothing;

  insert into public.platform_institutions (name, institution_type)
  values ('Atomic approval test institution', 'school')
  returning id into v_institution;

  insert into public.platform_institution_members (institution_id, user_id, membership_role, status)
  values
    (v_institution, v_moderator, 'administrator', 'active'),
    (v_institution, v_owner, 'student', 'active');

  execute 'set local role service_role';

  -- An authenticated actor without the global approval permission is rejected
  -- before any subject or lesson write occurs.
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', 'Atomic approval permission denied fixture',
      'lessons', jsonb_build_array(jsonb_build_object('title', 'Must not be inserted', 'summary', 'Denied content')))
  ) returning id into v_permission_denied_draft;

  begin
    perform public.approve_generated_course_draft(v_permission_denied_draft, v_no_permission);
  exception when insufficient_privilege then
    v_permission_denied := true;
  end;

  if not v_permission_denied
     or exists (select 1 from public.subjects where user_id = v_owner and name = 'Atomic approval permission denied fixture')
     or exists (select 1 from public.generated_course_drafts where id = v_permission_denied_draft and status = 'approved') then
    raise exception 'An actor without approve_drafts permission was allowed to approve a course';
  end if;

  -- Global administrators can approve legacy/unscoped drafts.
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object(
      'title', 'Atomic approval global fixture',
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'Foundations', 'summary', 'Foundation lesson content', 'blocks', jsonb_build_array(jsonb_build_object('type','concept','content','Foundation lesson content'))),
        jsonb_build_object('title', 'Applications', 'summary', 'Application lesson content', 'prerequisites', jsonb_build_array('Foundations'), 'blocks', jsonb_build_array(jsonb_build_object('type','concept','content','Application lesson content')))
      )
    )
  ) returning id into v_global_draft;

  select public.approve_generated_course_draft(v_global_draft, v_admin) into v_global_result;
  if (v_global_result->>'lessonsInserted')::integer <> 2 then
    raise exception 'Expected two lessons in the global approval result: %', v_global_result;
  end if;

  select public.approve_generated_course_draft(v_global_draft, v_admin) into v_retry_result;
  if v_retry_result->>'alreadyApproved' <> 'true' then
    raise exception 'Repeated approval was not acknowledged as an idempotent replay: %', v_retry_result;
  end if;

  select count(*) into v_approval_count
    from public.generated_course_approvals where draft_id = v_global_draft;
  select count(*) into v_lesson_count
    from public.learn_lessons where user_id = v_owner and subject_id in (
      select id from public.subjects where user_id = v_owner and name = 'Atomic approval global fixture'
    );
  select count(*) into v_prerequisite_count
    from public.lesson_prerequisites lp
    join public.learn_lessons l on l.id = lp.lesson_id
   where l.user_id = v_owner
     and l.subject_id in (select id from public.subjects where user_id = v_owner and name = 'Atomic approval global fixture');

  if v_approval_count <> 1 or v_lesson_count <> 2 or v_prerequisite_count <> 1 then
    raise exception 'Idempotent approval duplicated side effects: approvals %, lessons %, prerequisites %',
      v_approval_count, v_lesson_count, v_prerequisite_count;
  end if;

  if not exists (
    select 1 from public.generated_course_drafts
     where id = v_global_draft and status = 'approved' and approved_by = v_admin
  ) or not exists (
    select 1 from public.generated_course_approvals
     where draft_id = v_global_draft and approved_by = v_admin
  ) then
    raise exception 'Draft status and approval audit actor were not committed with the course';
  end if;

  -- A moderator must be an active administrator of the draft's explicit institution.
  insert into public.generated_course_drafts (user_id, institution_id, draft)
  values (
    v_owner,
    v_institution,
    jsonb_build_object('title', 'Atomic approval institution fixture',
      'lessons', jsonb_build_array(jsonb_build_object('title', 'Institution lesson', 'summary', 'Institution lesson content')))
  ) returning id into v_scoped_draft;

  perform public.approve_generated_course_draft(v_scoped_draft, v_moderator);

  -- Even a global admin cannot attach an owner who is not an active member
  -- of the draft's institution.
  insert into public.generated_course_drafts (user_id, institution_id, draft)
  values (
    v_nonmember,
    v_institution,
    jsonb_build_object('title', 'Atomic approval owner mismatch fixture',
      'lessons', jsonb_build_array(jsonb_build_object('title', 'Wrong owner lesson', 'summary', 'Must roll back')))
  ) returning id into v_owner_mismatch_draft;

  begin
    perform public.approve_generated_course_draft(v_owner_mismatch_draft, v_admin);
  exception when insufficient_privilege then
    v_owner_mismatch_denied := true;
  end;

  if not v_owner_mismatch_denied
     or exists (select 1 from public.subjects where user_id = v_nonmember and name = 'Atomic approval owner mismatch fixture')
     or exists (select 1 from public.generated_course_drafts where id = v_owner_mismatch_draft and status = 'approved') then
    raise exception 'A draft owner outside the institution was allowed to receive course writes';
  end if;

  -- A moderator cannot approve a legacy/unscoped draft, even when they are an
  -- administrator of some other institution.
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', 'Atomic approval unscoped moderator fixture',
      'lessons', jsonb_build_array(jsonb_build_object('title', 'Must remain pending', 'summary', 'Unscoped draft content')))
  ) returning id into v_unscoped_draft;

  begin
    perform public.approve_generated_course_draft(v_unscoped_draft, v_moderator);
  exception when insufficient_privilege then
    v_unscoped_denied := true;
  end;

  if not v_unscoped_denied
     or exists (select 1 from public.subjects where user_id = v_owner and name = 'Atomic approval unscoped moderator fixture')
     or exists (select 1 from public.generated_course_drafts where id = v_unscoped_draft and status = 'approved') then
    raise exception 'A moderator was allowed to approve an unscoped legacy draft';
  end if;

  -- A moderator with the same global permission but no active membership cannot approve.
  insert into public.generated_course_drafts (user_id, institution_id, draft)
  values (
    v_owner,
    v_institution,
    jsonb_build_object('title', 'Atomic approval denied fixture',
      'lessons', jsonb_build_array(jsonb_build_object('title', 'Must not be inserted', 'summary', 'Denied content')))
  ) returning id into v_denied_draft;

  begin
    perform public.approve_generated_course_draft(v_denied_draft, v_nonmember);
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'A moderator without active institution administrator membership was allowed to approve';
  end if;

  if exists (
    select 1 from public.generated_course_drafts
     where id = v_denied_draft and status = 'approved'
  ) or exists (
    select 1 from public.subjects
     where user_id = v_owner and name = 'Atomic approval denied fixture'
  ) then
    raise exception 'Denied approval left partial writes';
  end if;

  -- Duplicate lesson titles fail after subject creation and the first lesson insert.
  -- The exception subtransaction must roll back the subject and every lesson write.
  v_subject_name := 'Atomic approval rollback fixture';
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'Duplicate', 'summary', 'First duplicate'),
        jsonb_build_object('title', 'duplicate', 'summary', 'Second duplicate')
      ))
  ) returning id into v_rollback_draft;

  begin
    perform public.approve_generated_course_draft(v_rollback_draft, v_admin);
  exception when invalid_parameter_value then
    v_rollback := true;
  end;

  if not v_rollback then
    raise exception 'Invalid duplicate-title draft was unexpectedly approved';
  end if;

  if exists (select 1 from public.subjects where user_id = v_owner and name = v_subject_name)
     or exists (select 1 from public.generated_course_approvals where draft_id = v_rollback_draft)
     or exists (select 1 from public.generated_course_drafts where id = v_rollback_draft and status = 'approved') then
    raise exception 'Failed approval did not roll back all side effects';
  end if;

  -- Unknown prerequisite titles are rejected after lesson creation, and the
  -- complete transaction must roll back rather than silently dropping the link.
  v_subject_name := 'Atomic approval unknown prerequisite fixture';
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'First lesson', 'summary', 'First lesson content'),
        jsonb_build_object('title', 'Second lesson', 'summary', 'Second lesson content', 'prerequisites', jsonb_build_array('Missing lesson'))
      ))
  ) returning id into v_unknown_prereq_draft;

  begin
    perform public.approve_generated_course_draft(v_unknown_prereq_draft, v_admin);
  exception when invalid_parameter_value then
    v_unknown_prereq_failed := true;
  end;

  if not v_unknown_prereq_failed
     or exists (select 1 from public.subjects where user_id = v_owner and name = v_subject_name)
     or exists (select 1 from public.generated_course_approvals where draft_id = v_unknown_prereq_draft)
     or exists (select 1 from public.generated_course_drafts where id = v_unknown_prereq_draft and status = 'approved') then
    raise exception 'Unknown prerequisite did not abort and roll back the course approval';
  end if;

  -- Forward references would permit circular or ill-ordered learning paths.
  -- The approval transaction requires every prerequisite to precede its lesson.
  v_subject_name := 'Atomic approval forward prerequisite fixture';
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'First lesson', 'summary', 'First lesson content', 'prerequisites', jsonb_build_array('Second lesson')),
        jsonb_build_object('title', 'Second lesson', 'summary', 'Second lesson content')
      ))
  ) returning id into v_forward_prereq_draft;

  begin
    perform public.approve_generated_course_draft(v_forward_prereq_draft, v_admin);
  exception when invalid_parameter_value then
    v_forward_prereq_failed := true;
  end;

  if not v_forward_prereq_failed
     or exists (select 1 from public.subjects where user_id = v_owner and name = v_subject_name)
     or exists (select 1 from public.generated_course_approvals where draft_id = v_forward_prereq_draft)
     or exists (select 1 from public.generated_course_drafts where id = v_forward_prereq_draft and status = 'approved') then
    raise exception 'Forward prerequisite did not abort and roll back the course approval';
  end if;

  -- Inject an audit-write failure after the subject and lesson have been inserted.
  v_subject_name := 'Atomic approval audit failure fixture';
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'Audit fixture lesson', 'summary', 'Audit fixture content')
      ))
  ) returning id into v_audit_failure_draft;

  perform set_config('app.test_fail_course_audit', 'on', true);
  begin
    perform public.approve_generated_course_draft(v_audit_failure_draft, v_admin);
  exception when raise_exception then
    v_audit_failed := true;
  end;
  perform set_config('app.test_fail_course_audit', 'off', true);

  if not v_audit_failed
     or exists (select 1 from public.subjects where user_id = v_owner and name = v_subject_name)
     or exists (select 1 from public.generated_course_approvals where draft_id = v_audit_failure_draft)
     or exists (select 1 from public.generated_course_drafts where id = v_audit_failure_draft and status = 'approved') then
    raise exception 'Audit failure did not roll back the complete course approval';
  end if;

  -- Inject a failure after the approval audit insert. The audit and course
  -- rows must still commit or roll back as one unit.
  v_subject_name := 'Atomic approval status failure fixture';
  insert into public.generated_course_drafts (user_id, draft)
  values (
    v_owner,
    jsonb_build_object('title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'Status fixture lesson', 'summary', 'Status fixture content')
      ))
  ) returning id into v_status_failure_draft;

  perform set_config('app.test_fail_course_status', 'on', true);
  begin
    perform public.approve_generated_course_draft(v_status_failure_draft, v_admin);
  exception when raise_exception then
    v_status_failed := true;
  end;
  perform set_config('app.test_fail_course_status', 'off', true);

  if not v_status_failed
     or exists (select 1 from public.subjects where user_id = v_owner and name = v_subject_name)
     or exists (select 1 from public.generated_course_approvals where draft_id = v_status_failure_draft)
     or exists (select 1 from public.generated_course_drafts where id = v_status_failure_draft and status = 'approved') then
    raise exception 'Status update failure did not roll back the approval audit and course rows';
  end if;
end
$test$;

rollback;
