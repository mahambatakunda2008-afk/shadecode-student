-- Run against a disposable Supabase test project after migrations are applied.
-- Generated lesson reconciliation must persist topic while the current
-- progress-only mutation contract remains covered by
-- offline_progress_sync_preserves_lesson.test.sql.
begin;
do $$
declare
  v_user uuid;
  v_subject uuid;
  v_lesson uuid := gen_random_uuid();
  v_result jsonb;
begin
  if has_function_privilege('public', 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)', 'execute') then
    raise exception 'PUBLIC must not execute apply_sync_mutation';
  end if;
  if not has_function_privilege('authenticated', 'public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text)', 'execute') then
    raise exception 'authenticated must execute apply_sync_mutation';
  end if;

  select l.user_id,l.subject_id
  into v_user,v_subject
  from public.learn_lessons l
  where l.user_id is not null and l.subject_id is not null
  order by l.created_at desc nulls last
  limit 1;

  if v_user is null or v_subject is null then
    raise exception 'Missing owned lesson fixture with subject for generated lesson sync contract';
  end if;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
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

  if not exists (
    select 1 from public.learn_lessons
    where id=v_lesson
      and user_id=v_user
      and subject_id=v_subject
      and topic='Quadratic inequalities'
      and title='Quadratic inequalities: a complete lesson'
  ) then
    raise exception 'Generated lesson sync did not persist its topic and metadata';
  end if;
end $$;
rollback;
