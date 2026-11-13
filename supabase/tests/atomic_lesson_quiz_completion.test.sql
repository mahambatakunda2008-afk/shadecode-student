-- Run against a disposable transaction in a Supabase test project.
-- Exercises server grading, idempotent completion, answer locking and durable event insertion.
begin;
do $$
declare
  v_user uuid;
  v_lesson uuid;
  v_attempt uuid;
  v_claim jsonb;
  v_result jsonb;
  v_retry jsonb;
  v_event_count integer;
  v_conflict boolean := false;
begin
  select u.id,l.id into v_user,v_lesson
  from auth.users u
  join public.learn_lessons l on l.user_id=u.id
  join public.subjects s on s.id=l.subject_id and s.user_id=u.id
  order by l.created_at desc nulls last limit 1;
  if v_user is null or v_lesson is null then raise exception 'Missing quiz completion fixture'; end if;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  execute 'set local role service_role';
  insert into public.lesson_quiz_attempts(user_id,lesson_id,questions)
  values(v_user,v_lesson,'[
    {"id":1,"question":"fixture 1","options":["a","b","c","d"],"correctIndex":2,"explanation":"fixture"},
    {"id":2,"question":"fixture 2","options":["a","b","c","d"],"correctIndex":1,"explanation":"fixture"}
  ]'::jsonb)
  returning id into v_attempt;

  if has_function_privilege('authenticated','public.record_curriculum_assessment_result(uuid,uuid,text[],numeric,integer,integer,uuid,jsonb)','EXECUTE') then
    raise exception 'Authenticated role can bypass verified quiz completion to write curriculum mastery';
  end if;
  if has_function_privilege('authenticated','public.record_curriculum_assessment_result_idempotent(uuid,uuid,text[],numeric,integer,integer,uuid,text,jsonb)','EXECUTE') then
    raise exception 'Authenticated role can directly submit curriculum assessment scores';
  end if;

  execute 'set local role authenticated';
  select public.claim_lesson_quiz_attempt(v_attempt,array[2,0]) into v_claim;
  if v_claim->>'status' <> 'processing' then raise exception 'Quiz claim did not enter processing'; end if;

  select public.complete_lesson_quiz_attempt(v_attempt) into v_result;
  if (v_result->>'score')::numeric <> 50 or (v_result->>'correctCount')::integer <> 1 then
    raise exception 'Server-side quiz grading is incorrect: %',v_result;
  end if;

  select public.complete_lesson_quiz_attempt(v_attempt) into v_retry;
  if v_retry <> v_result then raise exception 'Completed quiz replay returned a different result'; end if;

  begin
    perform public.claim_lesson_quiz_attempt(v_attempt,array[1,1]);
  exception when others then
    v_conflict := true;
  end;
  if not v_conflict then raise exception 'Different answer replay was not rejected'; end if;

  execute 'set local role service_role';
  select count(*) into v_event_count from public.cortex_events
  where user_id=v_user and data->>'eventId'='lesson_quiz_'||v_attempt::text;
  if v_event_count <> 1 then raise exception 'Expected exactly one durable Cortex completion event, got %',v_event_count; end if;

  if not exists(select 1 from public.lesson_quiz_attempts where id=v_attempt and status='completed' and result=v_result) then
    raise exception 'Quiz result was not atomically finalized';
  end if;
end $$;
rollback;
