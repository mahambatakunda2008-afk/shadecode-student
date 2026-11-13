-- Replay-safe curriculum quiz assessment recording.
create or replace function public.record_curriculum_assessment_result_idempotent(
  p_user_id uuid,p_curriculum_version_id uuid,p_objective_keys text[],p_score numeric,
  p_correct_count integer,p_question_count integer,p_lesson_id uuid,p_attempt_id text,
  p_evidence jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_existing public.learner_curriculum_assessment_attempts%rowtype; v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Unauthorized'; end if;
  if p_attempt_id is null or length(trim(p_attempt_id)) < 8 or length(p_attempt_id)>200 then raise exception 'Invalid attempt identity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_attempt_id,0));
  select * into v_existing from public.learner_curriculum_assessment_attempts where user_id=p_user_id and evidence->>'attemptId'=p_attempt_id limit 1;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object('objectiveKey',objective_key,'status',status,'masteryScore',mastery_score,'attempts',attempts,'masteredAt',mastered_at) order by objective_key),'[]'::jsonb)
    into v_result from public.learner_curriculum_objective_progress where user_id=p_user_id and curriculum_version_id=v_existing.curriculum_version_id and objective_key=any(v_existing.objective_keys);
    return jsonb_build_object('score',v_existing.score,'correctCount',v_existing.correct_count,'questionCount',v_existing.question_count,'objectives',v_result,'duplicate',true);
  end if;
  return public.record_curriculum_assessment_result(p_user_id,p_curriculum_version_id,p_objective_keys,p_score,p_correct_count,p_question_count,p_lesson_id,coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('attemptId',p_attempt_id));
end; $$;
revoke all on function public.record_curriculum_assessment_result_idempotent(uuid,uuid,text[],numeric,integer,integer,uuid,text,jsonb) from public,anon;
grant execute on function public.record_curriculum_assessment_result_idempotent(uuid,uuid,text[],numeric,integer,integer,uuid,text,jsonb) to authenticated;
