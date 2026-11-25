-- Run after the current progress-preservation migration and this topic migration.
-- Recovered lesson content must not reset progress already recorded on the server.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_subject uuid := gen_random_uuid();
  v_lesson uuid := gen_random_uuid();
  v_result jsonb;
  v_difficulty text;
  v_progress integer;
begin
  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(p.proacl) acl
    where p.oid = 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC must not execute apply_sync_mutation';
  end if;
  if not has_function_privilege('authenticated', 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)', 'execute') then
    raise exception 'authenticated must execute apply_sync_mutation';
  end if;

  insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values (v_user, 'authenticated', 'authenticated', 'sync-contract-' || v_user::text || '@example.invalid', '', now(), now(), now());
  insert into public.subjects(id, user_id, name)
  values (v_subject, v_user, 'Sync contract subject');
  insert into public.learn_lessons(id,user_id,subject_id,topic,title,description,difficulty,progress,blocks)
  values (
    v_lesson,v_user,v_subject,'Original topic','Original lesson title',
    'Previously saved lesson','hard',63,
    '[{"type":"explanation","content":"Previously saved block"}]'::jsonb
  );

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_user::text,'role','authenticated')::text, true);
  execute 'set local role authenticated';

  select public.apply_sync_mutation(
    'learn_lessons', 'create', v_lesson::text,
    jsonb_build_object(
      'id',v_lesson::text, 'user_id',v_user::text, 'subject_id',v_subject::text,
      'topic','Quadratic inequalities',
      'title','Quadratic inequalities: a complete lesson',
      'description','Recovered generated lesson content',
      'difficulty','adaptive', 'progress',0,
      'blocks','[{"type":"explanation","content":"Recovered lesson block"}]'::jsonb
    ),
    0, 1, 'generated-lesson-topic-contract-test'
  ) into v_result;

  if v_result->>'status' <> 'accepted' then
    raise exception 'Generated lesson sync was not accepted: %',v_result;
  end if;
  select difficulty, progress into v_difficulty, v_progress
  from public.learn_lessons
  where id=v_lesson and user_id=v_user and subject_id=v_subject
    and topic='Quadratic inequalities'
    and title='Quadratic inequalities: a complete lesson'
    and blocks='[{"type":"explanation","content":"Recovered lesson block"}]'::jsonb;
  if not found then
    raise exception 'Generated lesson sync did not persist its topic and content';
  end if;
  if v_difficulty <> 'medium' then
    raise exception 'Unsupported difficulty was not normalized to medium: %',v_difficulty;
  end if;
  if v_progress <> 63 then
    raise exception 'Recovered lesson sync regressed existing progress: expected 63, got %',v_progress;
  end if;
end $$;
rollback;
