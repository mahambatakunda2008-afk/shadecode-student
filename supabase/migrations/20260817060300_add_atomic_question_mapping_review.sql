create or replace function public.review_exam_question_topic_proposal(p_proposal_id uuid, p_status text, p_reviewer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_question_id uuid;
  v_topic_id text;
  v_current_status text;
begin
  if not has_role(p_reviewer_id, 'admin') then
    raise exception 'forbidden';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  select question_id, proposed_topic_id, status
    into v_question_id, v_topic_id, v_current_status
  from public.exam_question_topic_proposals
  where id = p_proposal_id
  for update;

  if not found then raise exception 'proposal not found'; end if;
  if v_current_status <> 'pending' then raise exception 'proposal already reviewed'; end if;

  if p_status = 'approved' then
    update public.exam_questions set topic_id = v_topic_id where id = v_question_id;
    if not found then raise exception 'question not found'; end if;
  end if;

  update public.exam_question_topic_proposals
  set status = p_status, reviewer_id = p_reviewer_id, reviewed_at = now()
  where id = p_proposal_id;
end;
$$;

revoke all on function public.review_exam_question_topic_proposal(uuid, text, uuid) from public;
revoke all on function public.review_exam_question_topic_proposal(uuid, text, uuid) from anon;
grant execute on function public.review_exam_question_topic_proposal(uuid, text, uuid) to authenticated, service_role;
