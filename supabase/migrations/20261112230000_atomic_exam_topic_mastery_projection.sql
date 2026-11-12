create table if not exists public.exam_mastery_projection_ledger (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null,
  subject text not null,
  topic text not null,
  projected_at timestamptz not null default now(),
  primary key(user_id,attempt_id,subject,topic)
);
alter table public.exam_mastery_projection_ledger enable row level security;
revoke all on public.exam_mastery_projection_ledger from public,anon,authenticated;
grant all on public.exam_mastery_projection_ledger to service_role;
drop policy if exists exam_mastery_projection_ledger_service_role_all on public.exam_mastery_projection_ledger;
create policy exam_mastery_projection_ledger_service_role_all on public.exam_mastery_projection_ledger
  for all to service_role using (true) with check (true);

create or replace function public.project_exam_topic_mastery(
  p_user_id uuid,
  p_attempt_id text,
  p_subject text,
  p_topic text,
  p_percentage numeric,
  p_observed_at timestamptz default now()
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing public.topic_mastery%rowtype;
  v_exists boolean;
  v_mastery numeric;
  v_previous_mastery numeric;
  v_retention numeric;
  v_confidence numeric;
  v_stability numeric;
  v_exposure integer;
  v_error_rate numeric;
  v_response_speed numeric;
  v_prerequisite_health numeric;
  v_recent_improvement numeric;
  v_uncertainty numeric;
  v_attempts integer;
  v_last_score numeric;
  v_trend numeric;
  v_correct boolean;
begin
  if p_user_id is null or nullif(trim(p_attempt_id),'') is null
    or nullif(trim(p_subject),'') is null or nullif(trim(p_topic),'') is null
    or p_percentage is null or p_percentage < 0 or p_percentage > 100 then
    raise exception 'Invalid exam topic mastery projection';
  end if;

  insert into public.exam_mastery_projection_ledger(user_id,attempt_id,subject,topic)
  values(p_user_id,trim(p_attempt_id),trim(p_subject),trim(p_topic))
  on conflict do nothing;
  if not found then
    return false;
  end if;

  select * into v_existing
  from public.topic_mastery
  where user_id=p_user_id and subject=trim(p_subject) and topic=trim(p_topic)
  for update;
  v_exists := found;
  v_correct := p_percentage >= 50;

  if not v_exists then
    v_previous_mastery := null;
    v_mastery := round(p_percentage);
    v_retention := 50;
    v_confidence := 50;
    v_stability := 50;
    v_exposure := 1;
    v_error_rate := 50 * 0.85 + case when v_correct then 0 else 100 end * 0.15;
    v_response_speed := 50;
    v_prerequisite_health := 50;
    v_recent_improvement := v_mastery - 50;
    v_uncertainty := 80 * 0.92;
    v_attempts := 1;
    v_last_score := p_percentage;
    v_trend := 0;
    insert into public.topic_mastery(
      user_id,subject,topic,mastery_score,last_score,attempts,trend,last_attempted,
      retention,confidence,stability,exposure,error_rate,response_speed,
      prerequisite_health,recent_improvement,uncertainty
    ) values (
      p_user_id,trim(p_subject),trim(p_topic),v_mastery,v_last_score,v_attempts,v_trend,p_observed_at,
      v_retention,v_confidence,v_stability,v_exposure,v_error_rate,v_response_speed,
      v_prerequisite_health,v_recent_improvement,v_uncertainty
    );
  else
    v_previous_mastery := coalesce(v_existing.mastery_score,0);
    v_mastery := round(v_previous_mastery * 0.7 + p_percentage * 0.3);
    v_retention := greatest(0,least(100,v_existing.retention + case when v_correct then 1.5 else -2 end));
    v_confidence := v_existing.confidence;
    v_stability := greatest(0,least(100,v_existing.stability + case when v_correct then 1 else -1 end));
    v_exposure := greatest(0,v_existing.exposure)+1;
    v_error_rate := greatest(0,least(100,v_existing.error_rate*0.85 + case when v_correct then 0 else 100 end*0.15));
    v_response_speed := v_existing.response_speed;
    v_prerequisite_health := v_existing.prerequisite_health;
    v_recent_improvement := greatest(-100,least(100,v_mastery-v_previous_mastery));
    v_uncertainty := greatest(0,least(100,v_existing.uncertainty*0.92));
    v_attempts := coalesce(v_existing.attempts,0)+1;
    v_last_score := p_percentage;
    v_trend := v_mastery-v_previous_mastery;

    update public.topic_mastery set
      mastery_score=v_mastery,last_score=v_last_score,attempts=v_attempts,trend=v_trend,
      last_attempted=p_observed_at,retention=v_retention,confidence=v_confidence,
      stability=v_stability,exposure=v_exposure,error_rate=v_error_rate,
      response_speed=v_response_speed,prerequisite_health=v_prerequisite_health,
      recent_improvement=v_recent_improvement,uncertainty=v_uncertainty
    where id=v_existing.id;
  end if;

  return true;
end;
$$;

revoke all on function public.project_exam_topic_mastery(uuid,text,text,text,numeric,timestamptz) from public,anon,authenticated;
grant execute on function public.project_exam_topic_mastery(uuid,text,text,text,numeric,timestamptz) to service_role;
