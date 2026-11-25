-- Run against a disposable Supabase test project after migrations are applied.
-- The fixture is created inside this transaction so the contract also runs on
-- a clean branch with no copied production data.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_subject uuid := gen_random_uuid();
  v_lesson uuid := gen_random_uuid();
  v_result jsonb;
  v_difficulty text;
begin
  if has_function_privilege('public', 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)', 'execute') then
    raise exception 'PUBLIC must not execute apply_sync_mutation';
  end if;
  if not has_function_privilege('authenticated', 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)', 'execute') then
    raise exception 'authenticated must execute apply_sync_mutation';
  end if;

  insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values (
    v_user,
    'authenticated',
    'authenticated',
    'sync-contract-' || v_user::text || '@example.invalid',
    '',
    now(),
    now(),
    now()
  );

  insert into public.subjects(id, user_id, name)
  values (v_subject, v_user, 'Sync contract subject');

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_user::text,'role','authenticated')::text, true);
  execute 'set local role authenticated';

  select public.apply_sync_mutation(
    'learn_lessons',
    'create',
    v_lesson::text,
    jsonb_build_object(
      'id',v_lesson::text,
      'user_id',v_user::text,
      'subject_id',v_subject::text,
      'topic','Quadratic inequalities',
      'title','Quadratic inequalities: a complete lesson',
      'description','Generated recovery contract fixture',
      'difficulty','adaptive',
      'progress',0,
      'blocks','[{"type":"explanation","content":"Test lesson block"}]'::jsonb
    ),
    0,
    1,
    'generated-lesson-topic-contract-test'
  ) into v_result;

  if v_result->>'status' <> 'accepted' then
    raise exception 'Generated lesson sync was not accepted: %',v_result;
  end if;

  select difficulty into v_difficulty
  from public.learn_lessons
  where id=v_lesson and user_id=v_user and subject_id=v_subject
    and topic='Quadratic inequalities'
    and title='Quadratic inequalities: a complete lesson';

  if not found then
    raise exception 'Generated lesson sync did not persist its topic and metadata';
  end if;
  if v_difficulty <> 'medium' then
    raise exception 'Unsupported difficulty was not normalized to medium: %',v_difficulty;
  end if;
end $$;
rollback;
