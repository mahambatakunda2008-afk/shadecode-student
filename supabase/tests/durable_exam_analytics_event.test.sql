begin;
set local role service_role;

do $$
declare
  v_user uuid := '12ac76a5-a686-47af-bbce-9eb69ca5dc00'::uuid;
  v_event uuid := gen_random_uuid();
  v_first boolean;
  v_retry boolean;
  v_count integer;
  v_row public.learning_events%rowtype;
begin
  v_first := public.record_exam_completion_analytics(
    v_user,v_event,'analytics-test-' || v_event::text,'Analytics regression',82,900,
    jsonb_build_object('grade','A','weakAreas',jsonb_build_array('Integration'))
  );
  if not v_first then raise exception 'First analytics event was not inserted'; end if;

  v_retry := public.record_exam_completion_analytics(
    v_user,v_event,'analytics-test-' || v_event::text,'Analytics regression',82,900,
    jsonb_build_object('grade','A')
  );
  if v_retry then raise exception 'Duplicate analytics event was inserted'; end if;

  select * into v_row from public.learning_events where id=v_event;
  if not found then raise exception 'Analytics event missing'; end if;
  if v_row.type <> 'exam_completed' or v_row.score <> 82 or v_row.time_spent <> 900 then
    raise exception 'Analytics event fields did not persist correctly';
  end if;
  if v_row.metadata->>'attemptId' <> 'analytics-test-' || v_event::text then
    raise exception 'Attempt identity missing from analytics metadata';
  end if;

  select count(*) into v_count from public.learning_events where id=v_event;
  if v_count <> 1 then raise exception 'Expected one analytics row, found %',v_count; end if;
end $$;

rollback;
