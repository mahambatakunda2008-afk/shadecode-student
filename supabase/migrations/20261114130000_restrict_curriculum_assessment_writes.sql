-- Curriculum mastery writes must only happen through the verified quiz
-- completion transaction, not through caller-supplied scores over PostgREST.
revoke all on function public.record_curriculum_assessment_result(
  uuid,uuid,text[],numeric,integer,integer,uuid,jsonb
) from public, anon, authenticated;
revoke all on function public.record_curriculum_assessment_result_idempotent(
  uuid,uuid,text[],numeric,integer,integer,uuid,text,jsonb
) from public, anon, authenticated;
