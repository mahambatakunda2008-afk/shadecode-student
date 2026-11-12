-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/atomic_cortex_exam_score.test.sql
-- All writes are rolled back. Uses an existing auth user as an isolated owner.
begin;

do $$
declare
  v_user uuid;
  v_identity text := 'atomic-score-test-' || gen_random_uuid()::text;
  v_result jsonb;
  v_matches integer;
  v_percentage numeric;
begin
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise exception 'Atomic Cortex exam score test requires at least one auth user';
  end if;

  perform public.record_exam_score(v_user, jsonb_build_object(
    'examId', 'test-first',
    'submissionIdentity', v_identity,
    'subject', 'Regression test',
    'score', 4,
    'totalMarks', 10,
    'percentage', 40,
    'date', now()
  ));

  v_result := public.record_exam_score(v_user, jsonb_build_object(
    'examId', 'test-retry',
    'submissionIdentity', v_identity,
    'subject', 'Regression test',
    'score', 9,
    'totalMarks', 10,
    'percentage', 90,
    'date', now()
  ));

  select count(*) into v_matches
  from jsonb_array_elements(v_result->'exam_scores') as item
  where item->>'submissionIdentity' = v_identity;

  if v_matches <> 1 then
    raise exception 'Retry must leave exactly one score entry; found %', v_matches;
  end if;

  select (item->>'percentage')::numeric into v_percentage
  from jsonb_array_elements(v_result->'exam_scores') as item
  where item->>'submissionIdentity' = v_identity;

  if v_percentage <> 90 then
    raise exception 'Retry must replace the prior score; expected 90, got %', v_percentage;
  end if;

  if (v_result->>'average_exam_score')::numeric is null then
    raise exception 'Average exam score must be computed';
  end if;
end $$;

rollback;
