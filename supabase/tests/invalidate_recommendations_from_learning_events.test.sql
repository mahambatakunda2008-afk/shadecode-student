begin;
set local role service_role;

do $$
declare
  v_user uuid;
  v_event uuid := gen_random_uuid();
  v_before bigint;
  v_after bigint;
  v_retry bigint;
begin
  select user_id into v_user from public.cortex_events order by created_at desc limit 1;
  if v_user is null then
    select user_id into v_user from public.recommendation_cache_versions limit 1;
  end if;
  if v_user is null then
    raise exception 'Test requires an existing auth user';
  end if;

  select coalesce(version,0) into v_before
  from public.recommendation_cache_versions where user_id=v_user;

  insert into public.cortex_events(id,user_id,type,source,data)
  values(v_event,v_user,'quiz.completed','regression-test','{}');

  select version into v_after
  from public.recommendation_cache_versions where user_id=v_user;

  if v_after <> coalesce(v_before,0)+1 then
    raise exception 'Relevant learning event did not bump generation: before %, after %',v_before,v_after;
  end if;

  insert into public.cortex_events(id,user_id,type,source,data)
  values(v_event,v_user,'quiz.completed','regression-test','{}')
  on conflict(id) do nothing;

  select version into v_retry
  from public.recommendation_cache_versions where user_id=v_user;

  if v_retry <> v_after then
    raise exception 'Duplicate event changed cache generation: after %, retry %',v_after,v_retry;
  end if;

  insert into public.cortex_events(id,user_id,type,source,data)
  values(gen_random_uuid(),v_user,'lesson.viewed','regression-test','{}');

  select version into v_retry
  from public.recommendation_cache_versions where user_id=v_user;

  if v_retry <> v_after then
    raise exception 'Non-invalidating event unexpectedly changed cache generation';
  end if;
end $$;

rollback;
