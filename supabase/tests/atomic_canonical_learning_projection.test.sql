-- Run with psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/atomic_canonical_learning_projection.test.sql
-- Uses a dedicated existing auth user and rolls back all writes.
begin;
set local role service_role;

do $$
declare
  v_user uuid := '12ac76a5-a686-47af-bbce-9eb69ca5dc00'::uuid;
  v_event text := 'canonical-projection-test-' || gen_random_uuid()::text;
  v_first boolean;
  v_duplicate boolean;
  v_second boolean;
  v_row public.topic_mastery%rowtype;
begin
  v_first := public.project_canonical_learning_observation(
    v_user,v_event,'Canonical projection regression','Atomic topic','TEST-SYLLABUS-A',null,60,true,70,30,now()
  );
  if not v_first then raise exception 'First canonical projection was not applied'; end if;

  v_duplicate := public.project_canonical_learning_observation(
    v_user,v_event,'Canonical projection regression','Atomic topic','TEST-SYLLABUS-A',null,60,true,70,30,now()
  );
  if v_duplicate then raise exception 'Duplicate canonical event was applied twice'; end if;

  select * into v_row from public.topic_mastery
  where user_id=v_user and subject='Canonical projection regression' and topic='Atomic topic' and syllabus_id='TEST-SYLLABUS-A';
  if not found then raise exception 'Canonical projection did not create topic mastery'; end if;
  if v_row.attempts <> 1 or v_row.exposure <> 1 or v_row.mastery_score <> 60 then
    raise exception 'Unexpected first projection values: attempts %, exposure %, mastery %',
      v_row.attempts,v_row.exposure,v_row.mastery_score;
  end if;

  v_second := public.project_canonical_learning_observation(
    v_user,v_event || '-second','Canonical projection regression','Atomic topic','TEST-SYLLABUS-A',null,100,true,90,15,now()
  );
  if not v_second then raise exception 'Second distinct canonical event was not applied'; end if;

  select * into v_row from public.topic_mastery
  where user_id=v_user and subject='Canonical projection regression' and topic='Atomic topic';
  if v_row.attempts <> 2 or v_row.exposure <> 2 or v_row.mastery_score <> 72 then
    raise exception 'Unexpected second projection values: attempts %, exposure %, mastery %',
      v_row.attempts,v_row.exposure,v_row.mastery_score;
  end if;
end $$;

rollback;
