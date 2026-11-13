begin;
set local role service_role;

do $$
declare
  v_user uuid;
  v_kind text;
  v_event uuid;
  v_before bigint;
  v_after bigint;
  v_retry bigint;
  v_expected bigint;
  v_invalidating_kinds text[] := array[
    'lesson_completed',
    'quiz_completed',
    'exam_completed',
    'study_session_finished',
    'activity_completed',
    'question_attempted',
    'task_completed',
    'mistake_reviewed',
    'project_evidence_added',
    'project_stage_completed'
  ];
begin
  select user_id into v_user from public.cortex_events order by created_at desc limit 1;
  if v_user is null then
    select user_id into v_user from public.recommendation_cache_versions limit 1;
  end if;
  if v_user is null then
    raise exception 'Test requires an existing auth user';
  end if;

  select coalesce(version,0) into v_expected
  from public.recommendation_cache_versions where user_id=v_user;

  foreach v_kind in array v_invalidating_kinds loop
    v_event := gen_random_uuid();
    v_before := coalesce(v_expected,0);

    insert into public.cortex_events(id,user_id,type,source,data)
    values(v_event,v_user,v_kind,'regression-test','{}');

    select version into v_after
    from public.recommendation_cache_versions where user_id=v_user;

    if v_after <> v_before + 1 then
      raise exception 'Event % did not bump generation once: before %, after %',v_kind,v_before,v_after;
    end if;

    insert into public.cortex_events(id,user_id,type,source,data)
    values(v_event,v_user,v_kind,'regression-test','{}')
    on conflict(id) do nothing;

    select version into v_retry
    from public.recommendation_cache_versions where user_id=v_user;

    if v_retry <> v_after then
      raise exception 'Duplicate % event changed cache generation: after %, retry %',v_kind,v_after,v_retry;
    end if;

    v_expected := v_after;
  end loop;

  v_before := v_expected;
  insert into public.cortex_events(id,user_id,type,source,data)
  values(gen_random_uuid(),v_user,'lesson_viewed','regression-test','{}');

  select version into v_after
  from public.recommendation_cache_versions where user_id=v_user;

  if coalesce(v_after,0) <> v_before then
    raise exception 'Non-invalidating lesson_viewed event unexpectedly changed cache generation';
  end if;
end $$;

rollback;
