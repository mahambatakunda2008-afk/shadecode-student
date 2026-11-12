create or replace function public.record_exam_completion_analytics(
  p_user_id uuid,
  p_event_id uuid,
  p_attempt_id text,
  p_subject text,
  p_percentage numeric,
  p_time_spent integer,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_user_id is null or p_event_id is null or nullif(trim(p_attempt_id),'') is null
    or nullif(trim(p_subject),'') is null or p_percentage is null
    or p_percentage < 0 or p_percentage > 100
    or p_time_spent is null or p_time_spent < 0 then
    raise exception 'Invalid exam analytics event';
  end if;

  insert into public.learning_events(
    id,user_id,type,subject,topic,score,time_spent,metadata,created_at
  ) values (
    p_event_id,p_user_id,'exam_completed',trim(p_subject),null,p_percentage,
    p_time_spent,coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('attemptId',trim(p_attempt_id)),
    now()
  )
  on conflict (id) do nothing;

  return found;
end;
$$;

revoke all on function public.record_exam_completion_analytics(uuid,uuid,text,text,numeric,integer,jsonb) from public,anon,authenticated;
grant execute on function public.record_exam_completion_analytics(uuid,uuid,text,text,numeric,integer,jsonb) to service_role;
