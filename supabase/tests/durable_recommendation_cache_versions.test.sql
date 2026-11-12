begin;
set local role service_role;

do $$
declare
  v_user uuid := '12ac76a5-a686-47af-bbce-9eb69ca5dc00'::uuid;
  v_event uuid := gen_random_uuid();
  v_first bigint;
  v_retry bigint;
  v_second bigint;
begin
  v_first := public.invalidate_recommendation_cache(v_user,v_event);
  if v_first is null or v_first < 1 then
    raise exception 'Initial invalidation did not create a positive version';
  end if;

  v_retry := public.invalidate_recommendation_cache(v_user,v_event);
  if v_retry <> v_first then
    raise exception 'Duplicate event changed cache version: first %, retry %',v_first,v_retry;
  end if;

  v_second := public.invalidate_recommendation_cache(v_user,gen_random_uuid());
  if v_second <> v_first + 1 then
    raise exception 'Distinct event did not increment cache version: first %, second %',v_first,v_second;
  end if;
end $$;

rollback;
