-- Run with psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/atomic_exam_topic_mastery_projection.test.sql
-- Uses a dedicated existing auth user and rolls back all writes.
begin;
set local role service_role;

do $$
declare
  v_user uuid := '12ac76a5-a686-47af-bbce-9eb69ca5dc00'::uuid;
  v_attempt text := 'topic-mastery-test-' || gen_random_uuid()::text;
  v_first boolean;
  v_retry boolean;
  v_row public.topic_mastery%rowtype;
  v_count integer;
  v_other boolean;
begin
  v_first := public.project_exam_topic_mastery(v_user,v_attempt,'Outbox regression','Atomic topic',60,now(),'TEST-SYLLABUS-A');
  if not v_first then raise exception 'First mastery projection was not applied'; end if;

  v_retry := public.project_exam_topic_mastery(v_user,v_attempt,'Outbox regression','Atomic topic',60,now());
  if v_retry then raise exception 'Duplicate mastery projection was applied twice'; end if;

  select * into v_row from public.topic_mastery
  where user_id=v_user and subject='Outbox regression' and topic='Atomic topic' and syllabus_id='TEST-SYLLABUS-A';
  if not found then raise exception 'Mastery row was not created'; end if;
  if v_row.attempts <> 1 or v_row.exposure <> 1 or v_row.mastery_score <> 60 then
    raise exception 'Unexpected first projection values: attempts %, exposure %, mastery %',
      v_row.attempts,v_row.exposure,v_row.mastery_score;
  end if;

  v_first := public.project_exam_topic_mastery(v_user,v_attempt || '-second','Outbox regression','Atomic topic',100,now(),'TEST-SYLLABUS-A');
  if not v_first then raise exception 'Second distinct attempt was not applied'; end if;

  select * into v_row from public.topic_mastery
  where user_id=v_user and subject='Outbox regression' and topic='Atomic topic';
  if v_row.attempts <> 2 or v_row.exposure <> 2 or v_row.mastery_score <> 72 then
    raise exception 'Unexpected second projection values: attempts %, exposure %, mastery %',
      v_row.attempts,v_row.exposure,v_row.mastery_score;
  end if;

  v_other := public.project_exam_topic_mastery(v_user,v_attempt,'Outbox regression','Atomic topic',20,now(),'TEST-SYLLABUS-B');
  if not v_other then raise exception 'Different syllabus attempt was not applied'; end if;

  select count(*) into v_count from public.topic_mastery
  where user_id=v_user and subject='Outbox regression' and topic='Atomic topic';
  if v_count <> 2 then raise exception 'Expected separate mastery rows for both syllabuses, found %',v_count; end if;

  select count(*) into v_count from public.exam_mastery_projection_ledger
  where user_id=v_user and attempt_id in (v_attempt,v_attempt || '-second') and syllabus_id='TEST-SYLLABUS-A';
  if v_count <> 2 then raise exception 'Expected two ledger keys, found %',v_count; end if;
end $$;

rollback;
