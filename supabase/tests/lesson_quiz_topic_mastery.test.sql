begin;
do $$
declare
  v_definition text;
  v_projector_signature regprocedure;
begin
  select pg_get_functiondef('public.complete_lesson_quiz_attempt(uuid)'::regprocedure)
    into v_definition;
  if position('project_canonical_learning_observation' in v_definition) = 0 then
    raise exception 'Lesson quiz completion does not project canonical topic evidence';
  end if;
  if position('curriculumTopicKey' in v_definition) = 0 or position('topicMapped' in v_definition) = 0 then
    raise exception 'Lesson quiz completion does not retain verified topic identity';
  end if;
  select p.oid::regprocedure into v_projector_signature
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='project_canonical_learning_observation';
  if v_projector_signature is null then raise exception 'Canonical projector RPC is missing'; end if;
  if has_function_privilege('authenticated', v_projector_signature, 'EXECUTE') then
    raise exception 'Canonical projector must remain unavailable to authenticated clients';
  end if;
end $$;

-- End-to-end database regression: a server-issued quiz for a uniquely mapped
-- verified syllabus topic must update topic_mastery in the same transaction.
do $$
declare
  v_user uuid;
  v_subject_id uuid;
  v_curriculum_version_id uuid;
  v_syllabus_id text;
  v_curriculum_subject text;
  v_topic text;
  v_lesson uuid;
  v_attempt uuid;
  v_claim jsonb;
  v_result jsonb;
  v_before_attempts integer := 0;
  v_after_attempts integer;
  v_event_count integer;
begin
  select s.user_id, s.id, cv.id, cv.syllabus_id, cv.subject_id, ck.title
    into v_user, v_subject_id, v_curriculum_version_id, v_syllabus_id, v_curriculum_subject, v_topic
  from public.curriculum_versions cv
  join public.curriculum_knowledge ck
    on ck.curriculum_version_id = cv.id
   and ck.kind = 'topic'
   and ck.status = 'verified'
   and ck.provenance->>'mappingStatus' = 'verified'
  join public.subjects s
    on s.user_id is not null
   and regexp_replace(lower(trim(s.name)), '[^a-z0-9]+', '', 'g')
       = regexp_replace(lower(trim(cv.subject_id)), '[^a-z0-9]+', '', 'g')
  where cv.status = 'verified'
    and ck.title is not null
    and (
      select count(*) from public.curriculum_knowledge candidate
      where candidate.curriculum_version_id = cv.id
        and candidate.kind = 'topic'
        and candidate.status = 'verified'
        and candidate.provenance->>'mappingStatus' = 'verified'
        and lower(trim(candidate.title)) = lower(trim(ck.title))
    ) = 1
  order by cv.created_at desc, ck.created_at desc
  limit 1;

  if v_user is null then raise exception 'No user/subject/verified-topic fixture is available'; end if;

  select attempts into v_before_attempts from public.topic_mastery
  where user_id=v_user and subject=v_curriculum_subject and topic=v_topic
    and syllabus_id=v_syllabus_id;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  execute 'set local role service_role';
  insert into public.learn_lessons(user_id,subject_id,title,topic,curriculum_version_id)
  values(v_user,v_subject_id,v_topic,v_topic,v_curriculum_version_id)
  returning id into v_lesson;

  insert into public.lesson_quiz_attempts(user_id,lesson_id,questions)
  values(v_user,v_lesson,'[
    {"id":"fixture-1","question":"Fixture question one","options":["a","b","c","d"],"correctIndex":2,"explanation":"fixture"},
    {"id":"fixture-2","question":"Fixture question two","options":["a","b","c","d"],"correctIndex":1,"explanation":"fixture"}
  ]'::jsonb)
  returning id into v_attempt;

  execute 'set local role authenticated';
  select public.claim_lesson_quiz_attempt(v_attempt,array[2,0]) into v_claim;
  if v_claim->>'status' <> 'processing' then raise exception 'Quiz attempt claim failed'; end if;

  select public.complete_lesson_quiz_attempt(v_attempt) into v_result;
  if v_result->>'topicMapped' <> 'true' then
    raise exception 'Verified topic was not mapped: %',v_result;
  end if;
  if (v_result->>'score')::numeric <> 50 then raise exception 'Server grading was incorrect'; end if;

  execute 'set local role service_role';
  select attempts into v_after_attempts from public.topic_mastery
  where user_id=v_user and subject=v_curriculum_subject and topic=v_topic
    and syllabus_id=v_syllabus_id;
  if v_after_attempts <> coalesce(v_before_attempts,0)+2 then
    raise exception 'Topic mastery exposure did not increment exactly once: before %, after %',
      coalesce(v_before_attempts,0),v_after_attempts;
  end if;

  select count(*) into v_event_count from public.cortex_events
  where user_id=v_user and data->>'eventId'='lesson_quiz_'||v_attempt::text;
  if v_event_count <> 1 then raise exception 'Expected exactly one quiz summary event, got %',v_event_count; end if;

  select count(*) into v_event_count from public.cortex_events
  where user_id=v_user and data->>'attemptId'=v_attempt::text
    and type='question_attempted' and source='lesson_quiz';
  if v_event_count <> 2 then raise exception 'Expected two durable question events, got %',v_event_count; end if;
  if not exists (
    select 1 from public.cortex_events
    where user_id=v_user and data->>'eventId'='lesson_quiz_'||v_attempt::text||'_q_1'
      and data->'metadata'->>'correct'='true'
  ) then raise exception 'First verified question evidence was not persisted correctly'; end if;
  if not exists (
    select 1 from public.cortex_events
    where user_id=v_user and data->>'eventId'='lesson_quiz_'||v_attempt::text||'_q_2'
      and data->'metadata'->>'correct'='false'
  ) then raise exception 'Second verified question evidence was not persisted correctly'; end if;
  if not exists (
    select 1 from public.cortex_events
    where user_id=v_user and data->>'eventId'='lesson_quiz_'||v_attempt::text
      and data->'metadata'->>'aggregateOnly'='true'
  ) then raise exception 'Quiz completion summary must be analytics-only'; end if;

  execute 'set local role authenticated';
  select public.complete_lesson_quiz_attempt(v_attempt) into v_result;
  execute 'set local role service_role';
  select attempts into v_after_attempts from public.topic_mastery
  where user_id=v_user and subject=v_curriculum_subject and topic=v_topic
    and syllabus_id=v_syllabus_id;
  if v_after_attempts <> coalesce(v_before_attempts,0)+2 then
    raise exception 'Replay changed the topic mastery exposure';
  end if;
end $$;
rollback;
