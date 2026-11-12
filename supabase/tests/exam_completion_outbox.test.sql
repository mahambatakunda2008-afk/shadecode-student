-- Run with psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/exam_completion_outbox.test.sql
-- All writes are rolled back.
begin;
set local role service_role;

do $$
declare
  v_user uuid := '12ac76a5-a686-47af-bbce-9eb69ca5dc00'::uuid;
  v_attempt text := 'outbox-regression-' || gen_random_uuid()::text;
  v_hash text := repeat('b',64);
  v_claim record;
  v_finalized boolean;
  v_job record;
  v_reclaimed record;
begin
  select * into v_claim
  from public.claim_exam_submission(v_user,v_attempt,v_hash);
  if v_claim.state <> 'claimed' then
    raise exception 'Expected new submission claim; got %',v_claim.state;
  end if;

  v_finalized := public.complete_exam_submission(
    v_user,v_attempt,v_hash,v_claim.claim_token,
    jsonb_build_object('percentage',80),
    jsonb_build_object('eventId',gen_random_uuid(),'subject','Outbox test','score',8,'maxScore',10)
  );
  if not v_finalized then raise exception 'Submission did not finalize'; end if;

  select * into v_job
  from public.claim_exam_completion_outbox(10)
  where attempt_id = v_attempt;
  if v_job.id is null then raise exception 'Completion did not enqueue an outbox job'; end if;

  if not public.finish_exam_completion_outbox(v_job.id,v_job.claim_token,'test transient failure') then
    raise exception 'Outbox failure acknowledgement did not update the job';
  end if;

  update public.exam_completion_outbox
  set next_attempt_at = now() - interval '1 second'
  where id = v_job.id;

  select * into v_reclaimed
  from public.claim_exam_completion_outbox(10)
  where attempt_id = v_attempt;
  if v_reclaimed.id is null or v_reclaimed.claim_token = v_job.claim_token then
    raise exception 'Failed job was not safely reclaimed with a new token';
  end if;

  if not public.finish_exam_completion_outbox(v_reclaimed.id,v_reclaimed.claim_token,null) then
    raise exception 'Reclaimed outbox job did not complete';
  end if;

  if public.finish_exam_completion_outbox(v_job.id,v_job.claim_token,null) then
    raise exception 'Stale worker token was incorrectly allowed to finalize';
  end if;
end $$;

rollback;
