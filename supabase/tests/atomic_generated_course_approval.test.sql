-- Run against a disposable Supabase test project with an existing approve_drafts user.
-- Verifies rollback after lesson writes, durable approval, and idempotent replay.
begin;
do $$
declare
  v_approver uuid;
  v_owner uuid;
  v_draft_id uuid := gen_random_uuid();
  v_subject_name text := '__atomic_course_test_' || replace(gen_random_uuid()::text, '-', '');
  v_result jsonb;
  v_retry jsonb;
  v_subject_count integer;
  v_lesson_count integer;
  v_approval_count integer;
  v_status text;
  v_failed boolean := false;
begin
  select id into v_approver
  from auth.users
  where public.has_permission(id, 'approve_drafts'::text)
  limit 1;
  if v_approver is null then
    raise exception 'Test fixture requires an auth user with approve_drafts permission';
  end if;
  v_owner := v_approver;

  execute 'set local role service_role';

  insert into public.generated_course_drafts(id, user_id, draft, status)
  values (
    v_draft_id,
    v_owner,
    jsonb_build_object(
      'title', v_subject_name,
      'lessons', jsonb_build_array(
        jsonb_build_object('title', 'Foundation', 'summary', 'Foundation lesson summary', 'blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', 'Foundation lesson content with enough detail.'))),
        jsonb_build_object('title', 'Application', 'summary', 'Application lesson summary', 'prerequisites', jsonb_build_array('Missing prerequisite'), 'blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', 'Application lesson content with enough detail.')))
      )
    ),
    'pending'
  );

  begin
    perform public.approve_generated_course_draft(v_draft_id, v_approver);
  exception when others then
    v_failed := true;
  end;
  if not v_failed then raise exception 'Invalid prerequisite did not abort approval'; end if;

  select count(*) into v_subject_count from public.subjects
  where user_id = v_owner and name = v_subject_name;
  select count(*) into v_lesson_count from public.learn_lessons l
  join public.subjects s on s.id = l.subject_id
  where l.user_id = v_owner and s.name = v_subject_name;
  select count(*) into v_approval_count from public.generated_course_approvals
  where draft_id = v_draft_id;
  select status into v_status from public.generated_course_drafts where id = v_draft_id;

  if v_subject_count <> 0 or v_lesson_count <> 0 or v_approval_count <> 0 or v_status <> 'pending' then
    raise exception 'Failed approval left partial writes: subjects %, lessons %, audits %, status %',
      v_subject_count, v_lesson_count, v_approval_count, v_status;
  end if;

  update public.generated_course_drafts
  set draft = jsonb_set(
    draft,
    '{lessons,1,prerequisites}',
    '["Foundation"]'::jsonb
  )
  where id = v_draft_id;

  select public.approve_generated_course_draft(v_draft_id, v_approver) into v_result;
  if v_result->>'ok' <> 'true' or v_result->>'alreadyApproved' <> 'false' then
    raise exception 'Approval did not return a committed result: %', v_result;
  end if;

  select public.approve_generated_course_draft(v_draft_id, v_approver) into v_retry;
  if v_retry->>'ok' <> 'true' or v_retry->>'alreadyApproved' <> 'true' then
    raise exception 'Approval replay was not idempotent: %', v_retry;
  end if;

  select count(*) into v_lesson_count from public.learn_lessons l
  join public.subjects s on s.id = l.subject_id
  where l.user_id = v_owner and s.name = v_subject_name;
  select count(*) into v_approval_count from public.generated_course_approvals
  where draft_id = v_draft_id;
  select status into v_status from public.generated_course_drafts where id = v_draft_id;

  if v_lesson_count <> 2 or v_approval_count <> 1 or v_status <> 'approved' then
    raise exception 'Committed approval state is inconsistent: lessons %, audits %, status %',
      v_lesson_count, v_approval_count, v_status;
  end if;
end $$;
rollback;
