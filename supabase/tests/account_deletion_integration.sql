-- Executable two-account integration contract. Runs only against the disposable CI Supabase stack.
-- Uses synthetic users and records; no hosted account or production data is touched.
do $$
declare
  v_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_request uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_lease uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_shared_lesson uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_private_lesson uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_manifest_count integer;
  v_completed boolean;
  v_table_name text;
  v_a_count bigint;
  v_b_count bigint;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
  values
    (v_a, 'authenticated', 'authenticated', 'account-a@example.test', '', now(), now()),
    (v_b, 'authenticated', 'authenticated', 'account-b@example.test', '', now(), now());

  insert into public.account_deletion_requests
    (id, user_id, status, requested_auth_time, lease_token, lease_expires_at)
  values (v_request, v_a, 'processing', now(), v_lease, now() + interval '10 minutes');

  -- A and B own independent records. A also moderates B's upload and authored
  -- a shared upload path referenced by both contributors.
  insert into public.daily_focus(user_id) values (v_a), (v_b);
  insert into public.academic_contexts(user_id) values (v_a), (v_b);
  insert into public.cortex_memory(user_id) values (v_a), (v_b);
  insert into public.project_evidence(user_id) values (v_a), (v_b);
  insert into public.exam_logs(user_id) values (v_a::text), (v_b::text);
  insert into public.user_profiles(user_id) values (v_a), (v_b);
  insert into public.feedback(user_id) values (v_a), (v_b);
  insert into public.exam_results(user_id) values (v_a), (v_b);

  -- Exercise every UUID user_id table represented in the cleanup inventory,
  -- not just the hand-picked examples above.
  for v_table_name in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and c.data_type = 'uuid'
      and c.table_name <> 'account_deletion_requests'
  loop
    execute format('insert into public.%I (user_id) values ($1), ($2)', v_table_name)
      using v_a, v_b;
  end loop;

  insert into public.community_uploads(contributor_id, moderator_id, moderator_notes, file_path)
  values
    (v_a, null, null, 'shared/contribution.pdf'),
    (v_b, v_a, 'reviewed by A', 'shared/contribution.pdf'),
    (v_a, null, null, 'a-private/contribution.pdf');

  insert into public.learn_lessons(id, user_id, title, topic, difficulty, blocks, progress)
  values
    (v_private_lesson, v_a, 'A private lesson', 'Vectors', 'AS', '[]'::jsonb, 10),
    (v_shared_lesson, v_b, 'B private lesson', 'Mechanics', 'AS', '[]'::jsonb, 10);
  insert into public.lesson_library(source_lesson_id, title, blocks, search_text)
  values
    (v_private_lesson, 'A published lesson', '[]'::jsonb, 'A lesson'),
    (v_shared_lesson, 'B published lesson', '[]'::jsonb, 'B lesson');

  insert into public.platform_user_relationships(subject_user_id, related_user_id, created_by, approved_by)
  values
    (v_b, v_b, v_a, v_a),
    (v_a, v_b, v_b, v_b);

  insert into public.user_roles(user_id, assigned_by) values (v_b, v_a);
  insert into public.exam_question_topic_proposals(user_id, reviewer_id) values (v_b, v_a);
  insert into public.generated_course_drafts(user_id, approved_by) values (v_b, v_a);
  insert into public.generated_course_approvals(approved_by, notes) values (v_a, 'approval by A');
  insert into public.published_learning_assets(user_id, reviewed_by) values (v_b, v_a);
  insert into public.curriculum_verification_events(reviewer_id, notes) values (v_a, 'review note');

  -- Storage manifest must include A's exclusive file, exclude the shared path,
  -- and never return B's UID-prefixed object.
  insert into storage.objects (bucket_id, name)
  values
    ('community-uploads-pending', v_a::text || '/uid-owned.pdf'),
    ('community-uploads-pending', v_b::text || '/b-owned.pdf');

  select count(*) into v_manifest_count
  from public.account_deletion_storage_manifest(v_a);

  if v_manifest_count <> 2 then
    raise exception 'Expected A UID-prefixed object plus A exclusive contributor path; got %', v_manifest_count;
  end if;

  if exists (
    select 1 from public.account_deletion_storage_manifest(v_a)
    where object_name = 'shared/contribution.pdf'
  ) then
    raise exception 'Manifest included a shared contributor object';
  end if;

  if exists (
    select 1 from public.account_deletion_storage_manifest(v_a)
    where object_name = v_b::text || '/b-owned.pdf'
  ) then
    raise exception 'Manifest included B UID-prefixed object';
  end if;

  perform public.execute_account_deletion_cleanup(v_request, v_lease);

  -- A's account-owned rows are removed; B's records remain.
  if exists (select 1 from public.daily_focus where user_id = v_a)
     or exists (select 1 from public.academic_contexts where user_id = v_a)
     or exists (select 1 from public.cortex_memory where user_id = v_a)
     or exists (select 1 from public.project_evidence where user_id = v_a)
     or exists (select 1 from public.exam_logs where user_id = v_a::text)
     or exists (select 1 from public.user_profiles where user_id = v_a)
     or exists (select 1 from public.feedback where user_id = v_a)
     or exists (select 1 from public.exam_results where user_id = v_a) then
    raise exception 'A-owned data survived transactional cleanup';
  end if;

  if not exists (select 1 from public.daily_focus where user_id = v_b)
     or not exists (select 1 from public.academic_contexts where user_id = v_b)
     or not exists (select 1 from public.cortex_memory where user_id = v_b)
     or not exists (select 1 from public.project_evidence where user_id = v_b)
     or not exists (select 1 from public.exam_logs where user_id = v_b::text)
     or not exists (select 1 from public.user_profiles where user_id = v_b)
     or not exists (select 1 from public.feedback where user_id = v_b)
     or not exists (select 1 from public.exam_results where user_id = v_b) then
    raise exception 'B-owned data was incorrectly removed';
  end if;

  -- B's shared upload and records survive; A's moderator attribution is cleared.
  if exists (select 1 from public.lesson_library where source_lesson_id = v_private_lesson)
     or not exists (select 1 from public.lesson_library where source_lesson_id = v_shared_lesson) then
    raise exception 'Lesson library source cleanup crossed account boundaries';
  end if;

  if not exists (
    select 1 from public.community_uploads
    where contributor_id = v_b and file_path = 'shared/contribution.pdf'
      and moderator_id is null and moderator_notes is null
  ) then
    raise exception 'B shared upload did not survive with moderator attribution cleared';
  end if;
  if exists (select 1 from public.community_uploads where contributor_id = v_a) then
    raise exception 'A contributor rows survived cleanup';
  end if;

  if not exists (
    select 1 from public.platform_user_relationships
    where subject_user_id = v_b and related_user_id = v_b
      and created_by is null and approved_by is null
  ) then
    raise exception 'B relationship was not preserved/anonymized';
  end if;
  if exists (select 1 from public.platform_user_relationships where subject_user_id = v_a) then
    raise exception 'Relationship involving A survived cleanup';
  end if;
  if not exists (select 1 from public.user_roles where user_id = v_b and assigned_by is null)
     or not exists (select 1 from public.exam_question_topic_proposals where user_id = v_b and reviewer_id is null)
     or not exists (select 1 from public.generated_course_drafts where user_id = v_b and approved_by is null)
     or not exists (select 1 from public.generated_course_approvals where approved_by is null and notes is null)
     or not exists (select 1 from public.published_learning_assets where user_id = v_b and reviewed_by is null)
     or not exists (select 1 from public.curriculum_verification_events where reviewer_id is null and notes is null) then
    raise exception 'One or more cross-account attribution fields were not cleared';
  end if;

  -- Simulate the worker's final Auth Admin deletion and completion step.
  delete from auth.users where id = v_a;

  -- Every UUID user_id table must lose A's row and retain B's row.
  for v_table_name in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and c.data_type = 'uuid'
      and c.table_name <> 'account_deletion_requests'
  loop
    execute format('select count(*) from public.%I where user_id = $1', v_table_name)
      into v_a_count using v_a;
    execute format('select count(*) from public.%I where user_id = $1', v_table_name)
      into v_b_count using v_b;
    if v_a_count <> 0 then
      raise exception 'A-owned rows survived in public.%: %', v_table_name, v_a_count;
    end if;
    if v_b_count = 0 then
      raise exception 'B-owned rows were removed from public.%', v_table_name;
    end if;
  end loop;

  if not exists (
    select 1 from public.lesson_library where source_lesson_id = v_shared_lesson
  ) then
    raise exception 'B published lesson did not survive Auth deletion';
  end if;

  select public.complete_account_deletion_request(v_request, v_lease) into v_completed;
  if not v_completed then
    raise exception 'Request did not complete after Auth deletion nulled user_id';
  end if;

  if not exists (
    select 1 from public.account_deletion_requests
    where id = v_request and status = 'completed' and user_id is null
  ) then
    raise exception 'Completed request is missing or still references deleted account';
  end if;

  if not exists (select 1 from auth.users where id = v_b) then
    raise exception 'Account B was deleted unexpectedly';
  end if;
end;
$$;
