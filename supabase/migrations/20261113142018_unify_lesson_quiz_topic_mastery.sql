create or replace function public.complete_lesson_quiz_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
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
  v_syllabus_id text;
  v_curriculum_subject text;
  v_topic_label text;
  v_topic_key text;
  v_topic_matches integer := 0;
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

  -- Resolve the exact verified syllabus identity attached to this lesson.
  select cv.syllabus_id, cv.subject_id
    into v_syllabus_id, v_curriculum_subject
  from public.curriculum_versions cv
  where cv.id = v_lesson.curriculum_version_id
    and cv.status = 'verified';

  -- A quiz only contributes topic mastery when its lesson topic maps to one
  -- unique, verified topic record in that exact curriculum version.
  if v_syllabus_id is not null and v_curriculum_subject is not null then
    select count(*)::integer, min(ck.title), min(ck.knowledge_key)
      into v_topic_matches, v_topic_label, v_topic_key
    from public.curriculum_knowledge ck
    where ck.curriculum_version_id = v_lesson.curriculum_version_id
      and ck.kind = 'topic'
      and ck.status = 'verified'
      and ck.provenance->>'mappingStatus' = 'verified'
      and (
        lower(trim(ck.title)) = lower(trim(coalesce(v_lesson.topic, v_lesson.title)))
        or lower(trim(ck.knowledge_key)) = lower(trim(coalesce(v_lesson.topic, v_lesson.title)))
        or lower(trim(coalesce(ck.topic_key,''))) = lower(trim(coalesce(v_lesson.topic, v_lesson.title)))
      );
    if v_topic_matches <> 1 then
      v_topic_label := null;
      v_topic_key := null;
    end if;
  end if;

  v_result := jsonb_build_object(
    'attemptId', v_attempt.id,
    'score', v_score,
    'correctCount', v_correct_count,
    'questionCount', v_question_count,
    'questions', v_reviewed,
    'curriculumTracked', v_curriculum_tracked,
    'mastery', v_mastery,
    'topicMapped', v_topic_key is not null
  );
  if v_reason is not null then v_result := v_result || jsonb_build_object('reason',v_reason); end if;

  v_event := jsonb_build_object(
    'eventId', 'lesson_quiz_' || v_attempt.id::text,
    'userId', v_user_id,
    'kind', 'quiz_completed',
    'occurredAt', now(),
    'source', 'lesson_quiz',
    'sourceEventId', v_attempt.id::text,
    'subjectId', coalesce(v_curriculum_subject, v_subject_name),
    'syllabusId', v_syllabus_id,
    'curriculumTopicKey', v_topic_key,
    'topicId', coalesce(v_topic_label, nullif(trim(coalesce(v_lesson.topic,'')),'')),
    'entityId', v_lesson.id::text,
    'attemptId', v_attempt.id::text,
    'metadata', jsonb_build_object(
      'score', v_score,
      'evidenceScore', v_score,
      'correct', v_score >= 50,
      'correctCount', v_correct_count,
      'questionCount', v_question_count,
      'curriculumTracked', v_curriculum_tracked,
      'aggregateOnly', false
    )
  );
  perform public.insert_canonical_cortex_event(v_user_id, v_event);

  -- Keep the canonical topic projection in the same transaction as the
  -- objective-level assessment and quiz completion. The attempt ID is stable,
  -- so retries cannot count the same quiz twice.
  if v_topic_key is not null then
    perform public.project_canonical_learning_observation(
      v_user_id,
      'lesson_quiz_' || v_attempt.id::text,
      v_curriculum_subject,
      v_topic_label,
      v_syllabus_id,
      v_topic_key,
      v_score,
      v_score >= 50,
      null,
      null,
      now()
    );
  end if;

  update public.lesson_quiz_attempts
  set status = 'completed',
      result = v_result,
      completed_at = coalesce(completed_at, now())
  where id = v_attempt.id and user_id = v_user_id;

  return v_result;
end;
$function$;