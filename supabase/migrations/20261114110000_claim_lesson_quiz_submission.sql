alter table public.lesson_quiz_attempts drop constraint if exists lesson_quiz_attempts_status_check;
alter table public.lesson_quiz_attempts add constraint lesson_quiz_attempts_status_check check (status in ('issued','processing','completed'));

create or replace function public.claim_lesson_quiz_attempt(p_attempt_id uuid,p_answers integer[])
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare v_attempt public.lesson_quiz_attempts%rowtype;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_answers is null or cardinality(p_answers)<1 or cardinality(p_answers)>50
     or exists(select 1 from unnest(p_answers) answer where answer<0 or answer>3) then
    raise exception 'Invalid answer selections';
  end if;
  select * into v_attempt from public.lesson_quiz_attempts
    where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'Quiz attempt not found'; end if;

  if v_attempt.status='completed' then
    if v_attempt.answers is distinct from p_answers then raise exception 'Attempt already submitted with different answers'; end if;
    return jsonb_build_object('status','completed','result',v_attempt.result);
  end if;
  if v_attempt.status='processing' and v_attempt.answers is distinct from p_answers then
    raise exception 'Attempt is already being submitted with different answers';
  end if;
  if v_attempt.status='issued' then
    update public.lesson_quiz_attempts set status='processing',answers=p_answers
      where id=p_attempt_id and user_id=auth.uid();
  end if;
  return jsonb_build_object('status','processing');
end;
$$;
revoke all on function public.claim_lesson_quiz_attempt(uuid,integer[]) from public,anon;
grant execute on function public.claim_lesson_quiz_attempt(uuid,integer[]) to authenticated;