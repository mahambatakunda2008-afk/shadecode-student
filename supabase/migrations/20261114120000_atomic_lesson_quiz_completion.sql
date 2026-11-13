-- Complete a server-issued lesson quiz as one transaction:
-- curriculum mastery, durable Cortex event, recommendation invalidation, and result.
create or replace function public.complete_lesson_quiz_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.lesson_quiz_attempts%rowtype;
  v_lesson public.learn_lessons%rowtype;
  v_subject_name text;
  v_correct_count integer;
  v_question_count integer;
  v_score numeric(5,2);
  v_reviewed jsonb;
  v_mastery jsonb := null;
  v_curriculum_tracked boolean := false;
  v_reason text;
  v_result jsonb;
  v_event jsonb;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select * into v_attempt
  from public.lesson_quiz_attempts
  where id = p_attempt_id and user_id = v_user_id
  for update;
  if not found then raise exception 'Quiz attempt not found'; end if;

  if v_attempt.status = 'completed' then
    return v_attempt.result;
  end if;
  if v_attempt.status <> 'processing' or v_attempt.answers is null then
    raise exception 'Quiz attempt must be claimed before completion';
  end if;

  v_question_count := jsonb_array_length(v_attempt.questions);
  if v_question_count < 1 or v_question_count > 50
     or cardinality(v_attempt.answers) <> v_question_count then
    raise exception 'Invalid stored quiz or answer count';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_attempt.questions) q
    where jsonb_typeof(q) <> 'object'
       or jsonb_typeof(q->'options') <> 'array'
       or jsonb_array_length(q->'options') <> 4
       or coalesce((q->>'correctIndex')::integer, -1) not between 0 and 3
  ) then
    raise exception 'Stored quiz contains invalid answer keys';
  end if;

  if exists (select 1 from unnest(v_attempt.answers) a where a not between 0 and 3) then
    raise exception 'Invalid answer selections';
  end if;

  select count(*)::integer into v_correct_count
  from jsonb_array_elements(v_attempt.questions) with ordinality q
  where v_attempt.answers[q.ordinality::integer] = (q.value->>'correctIndex')::integer;
  v_score := round((v_correct_count::numeric / v_question_count::numeric) * 100, 2);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.value->'id',
    'correctIndex', (q.value->>'correctIndex')::integer,
    'explanation', q.value->'explanation',
    'selectedIndex', v_attempt.answers[q.ordinality::integer],
    'correct', v_attempt.answers[q.ordinality::integer] = (q.value->>'correctIndex')::integer
  ) order by q.ordinality), '[]'::jsonb)
  into v_reviewed
  from jsonb_array_elements(v_attempt.questions) with ordinality q;

  select * into v_lesson
  from public.learn_lessons
  where id = v_attempt.lesson_id and user_id = v_user_id;
  if not found then raise exception 'Lesson not found or not owned by learner'; end if;

  select name into v_subject_name
  from public.subjects
  where id = v_lesson.subject_id and user_id = v_user_id;
  if v_subject_name is null then raise exception 'Lesson subject not found or not owned by learner'; end if;

  if v_lesson.curriculum_version_id is not null
     and coalesce(cardinality(v_lesson.curriculum_objective_keys), 0) > 0 then
    v_mastery := public.record_curriculum_assessment_result_idempotent(
      v_user_id,
      v_lesson.curriculum_version_id,
      v_lesson.curriculum_objective_keys,
      v_score,
      v_correct_count,
      v_question_count,
      v_lesson.id,
      v_attempt.id::text,
      jsonb_build_object('source','lesson_quiz','attemptId',v_attempt.id::text,'submittedAt',now())
    );
    v_curriculum_tracked := true;
  else
    v_reason := 'CURRICULUM_UNVERIFIED';
  end if;

  v_result := jsonb_build_object(
    'attemptId', v_attempt.id,
    'score', v_score,
    'correctCount', v_correct_count,
    'questionCount', v_question_count,
    'questions', v_reviewed,
    'curriculumTracked', v_curriculum_tracked,
    'mastery', v_mastery
  );
  if v_reason is not null then v_result := v_result || jsonb_build_object('reason',v_reason); end if;

  -- Deterministic identity makes replay safe. The trigger on cortex_events
  -- invalidates shared recommendation caches in this same transaction.
  v_event := jsonb_build_object(
    'eventId', 'lesson_quiz_' || v_attempt.id::text,
    'userId', v_user_id,
    'kind', 'quiz_completed',
    'occurredAt', now(),
    'source', 'lesson_quiz',
    'sourceEventId', v_attempt.id::text,
    'subjectId', v_subject_name,
    'entityId', v_lesson.id::text,
    'attemptId', v_attempt.id::text,
    'metadata', jsonb_build_object(
      'score', v_score,
      'correctCount', v_correct_count,
      'questionCount', v_question_count,
      'curriculumTracked', v_curriculum_tracked
    )
  );
  perform public.insert_canonical_cortex_event(v_user_id, v_event);

  update public.lesson_quiz_attempts
  set status = 'completed',
      result = v_result,
      completed_at = coalesce(completed_at, now())
  where id = v_attempt.id and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.complete_lesson_quiz_attempt(uuid) from public, anon;
grant execute on function public.complete_lesson_quiz_attempt(uuid) to authenticated;
