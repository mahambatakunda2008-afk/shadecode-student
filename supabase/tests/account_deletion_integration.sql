-- Executable two-account integration contract. Runs only against the disposable CI Supabase stack.
-- Uses synthetic users and records; no hosted account or production data is touched.
do $$
declare
  v_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_c uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_retry_request uuid := 'abababab-abab-4bab-8bab-abababababab';
  v_request uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_lease uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_shared_lesson uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_private_lesson uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_manifest_count integer;
  v_completed boolean;
  v_table_name text;
  v_a_count bigint;
  v_b_count bigint;
  v_retry_claim record;
  v_recovered integer;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
  values
    (v_a, 'authenticated', 'authenticated', 'account-a@example.test', '', now(), now()),
    (v_b, 'authenticated', 'authenticated', 'account-b@example.test', '', now(), now());

  insert into public.account_deletion_requests
    (id, user_id, status, requested_auth_time, lease_token, lease_expires_at)
  values (v_request, v_a, 'processing', now(), v_lease, now() + interval '10 minutes');


  -- Direct PostgREST/Supabase table writes are blocked for A while its
  -- deletion is processing, even when they bypass the /api/sync route.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    insert into public.daily_focus(user_id) values (v_a);
    raise exception 'Direct insert for pending account A was not blocked';
  exception
    when insufficient_privilege then null;
  end;


  begin
    insert into public.challenges(challenger_id, challenger_name)
    values (v_a, 'Pending account A');
    raise exception 'Direct insert into challenger-owned table was not blocked';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects(bucket_id, name)
    values ('community-uploads-pending', v_a::text || '/blocked-upload.pdf');
    raise exception 'Direct Storage object insert was not blocked';
  exception
    when insufficient_privilege then null;
  end;

  -- The barrier is scoped to the caller: B can still write their own row.
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  insert into public.daily_focus(user_id) values (v_b);

  -- Privileged worker operations are not blocked by the authenticated-user
  -- barrier, even if the JWT subject claim is present in this test session.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into public.daily_focus(user_id) values (v_a);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '', true);

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
  insert into public.challenges(challenger_id, challenger_name)
  values (v_a, 'Account A'), (v_b, 'Account B');

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
    (v_a, null, null, 'a-private/contribution.pdf'),
    -- A's UID-prefixed path is referenced by B, so it is not exclusively A's.
    (v_b, null, null, v_a::text || '/shared-by-b.pdf');

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

  insert into public.user_roles(user_id, assigned_by) values (v_a, v_b), (v_b, v_a);
  insert into public.exam_question_topic_proposals(reviewer_id) values (v_a);
  insert into public.generated_course_drafts(user_id, approved_by) values (v_b, v_a);
  insert into public.generated_course_approvals(approved_by, notes) values (v_a, '"approval by A"'::jsonb);
  insert into public.published_learning_assets(reviewed_by) values (v_a);
  insert into public.curriculum_verification_events(reviewer_id, notes) values (v_a, 'review note');

  -- Storage manifest must include A's exclusive file, exclude the shared path,
  -- and never return B's UID-prefixed object.
  insert into storage.objects (bucket_id, name)
  values
    ('community-uploads-pending', v_a::text || '/uid-owned.pdf'),
    ('community-uploads-pending', v_b::text || '/b-owned.pdf'),
    ('community-uploads-pending', v_a::text || '/shared-by-b.pdf');

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

  if exists (
    select 1 from public.account_deletion_storage_manifest(v_a)
    where object_name = v_a::text || '/shared-by-b.pdf'
  ) then
    raise exception 'Manifest included A-prefixed object referenced by B';
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

  if exists (select 1 from public.challenges where challenger_id = v_a)
     or not exists (select 1 from public.challenges where challenger_id = v_b) then
    raise exception 'Challenge ownership cleanup crossed account boundaries';
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

  if exists (select 1 from public.learn_lessons where id = v_private_lesson)
     or not exists (select 1 from public.learn_lessons where id = v_shared_lesson and user_id = v_b) then
    raise exception 'Account-owned lesson cleanup crossed account boundaries';
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
  if exists (select 1 from public.user_roles where user_id = v_a)
     or not exists (select 1 from public.user_roles where user_id = v_b and assigned_by is null)
     or not exists (select 1 from public.exam_question_topic_proposals where reviewer_id is null)
     or not exists (select 1 from public.generated_course_drafts where user_id = v_b and approved_by is null)
     or not exists (select 1 from public.generated_course_approvals where approved_by is null and notes is null)
     or not exists (select 1 from public.published_learning_assets where reviewed_by is null)
     or not exists (select 1 from public.curriculum_verification_events where reviewer_id is null and notes is null) then
    raise exception 'One or more cross-account attribution fields were not cleared';
  end if;

  -- A partially completed cleanup must not mark the account deleted while
  -- the Auth identity still exists. Crash recovery must leave it processing.
  select public.complete_account_deletion_request(v_request, v_lease) into v_completed;
  if v_completed then
    raise exception 'Request completed before Auth user deletion';
  end if;
  select public.recover_completed_account_deletion_requests() into v_recovered;
  if v_recovered <> 0 then
    raise exception 'Crash recovery falsely completed a request with a live Auth user';
  end if;
  if not exists (
    select 1 from public.account_deletion_requests
    where id = v_request and status = 'processing' and user_id = v_a and completed_at is null
  ) then
    raise exception 'Partial cleanup changed the request to a completed state';
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

  -- Retry lifecycle: a live account cannot be completed; a released lease is
  -- requeued, reclaimed with a fresh token, and remains incomplete.
  insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
  values (v_c, 'authenticated', 'authenticated', 'account-c@example.test', '', now(), now());
  insert into public.account_deletion_requests (id, user_id, status, requested_auth_time)
  values (v_retry_request, v_c, 'pending', now());

  select * into v_retry_claim from public.claim_account_deletion_request(300);
  if v_retry_claim.request_id <> v_retry_request or v_retry_claim.user_id <> v_c
     or v_retry_claim.attempt_count <> 1 then
    raise exception 'Initial retry-test lease was not claimed as expected';
  end if;

  select public.complete_account_deletion_request(v_retry_request, v_retry_claim.lease_token)
    into v_completed;
  if v_completed then
    raise exception 'Retry request completed while its Auth user still exists';
  end if;

  if public.release_account_deletion_request(v_retry_request, gen_random_uuid(), 'wrong_lease', true) then
    raise exception 'A mismatched lease token released the retry request';
  end if;
  if not public.release_account_deletion_request(v_retry_request, v_retry_claim.lease_token, 'simulated_storage_failure', true) then
    raise exception 'A valid retry lease could not be released';
  end if;
  if not exists (
    select 1 from public.account_deletion_requests
    where id = v_retry_request and status = 'pending' and user_id = v_c
      and lease_token is null and completed_at is null
  ) then
    raise exception 'Retry release did not safely requeue the request';
  end if;

  select * into v_retry_claim from public.claim_account_deletion_request(300);
  if v_retry_claim.request_id <> v_retry_request or v_retry_claim.user_id <> v_c
     or v_retry_claim.attempt_count <> 2 then
    raise exception 'Retry request was not reclaimed with an incremented attempt count';
  end if;
  select public.complete_account_deletion_request(v_retry_request, v_retry_claim.lease_token)
    into v_completed;
  if v_completed or not exists (
    select 1 from public.account_deletion_requests
    where id = v_retry_request and status = 'processing' and user_id = v_c and completed_at is null
  ) then
    raise exception 'Reclaimed retry request was incorrectly marked complete';
  end if;
end;
$$;
