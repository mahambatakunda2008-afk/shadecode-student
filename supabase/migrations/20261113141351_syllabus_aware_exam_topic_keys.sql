drop function if exists public.project_exam_topic_mastery(uuid,text,text,text,numeric,timestamptz,text);

create or replace function public.project_exam_topic_mastery(
  p_user_id uuid,
  p_attempt_id text,
  p_subject text,
  p_topic text,
  p_percentage numeric,
  p_observed_at timestamptz default now(),
  p_syllabus_id text default null,
  p_curriculum_topic_key text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing public.topic_mastery%rowtype;
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
    or p_percentage is null or p_percentage < 0 or p_percentage > 100
    or (p_syllabus_id is not null and nullif(trim(p_syllabus_id),'') is null)
    or (p_curriculum_topic_key is not null and nullif(trim(p_curriculum_topic_key),'') is null) then
    raise exception 'Invalid exam topic mastery projection';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || ':' || trim(p_subject) || ':' || trim(p_topic) || ':' || coalesce(trim(p_syllabus_id),'<legacy>'),0
  ));

  insert into public.exam_mastery_projection_ledger(user_id,attempt_id,subject,topic,syllabus_id)
  values(p_user_id,trim(p_attempt_id),trim(p_subject),trim(p_topic),nullif(trim(p_syllabus_id),''))
  on conflict do nothing;
  if not found then return false; end if;

  select * into v_existing from public.topic_mastery
  where user_id=p_user_id and subject=trim(p_subject) and topic=trim(p_topic)
    and syllabus_id is not distinct from nullif(trim(p_syllabus_id),'')
  for update;
  v_correct := p_percentage >= 50;

  if not found then
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
      user_id,subject,topic,syllabus_id,curriculum_topic_key,mastery_score,last_score,attempts,trend,last_attempted,
      retention,confidence,stability,exposure,error_rate,response_speed,
      prerequisite_health,recent_improvement,uncertainty
    ) values (
      p_user_id,trim(p_subject),trim(p_topic),nullif(trim(p_syllabus_id),''),nullif(trim(p_curriculum_topic_key),''),v_mastery,v_last_score,v_attempts,v_trend,p_observed_at,
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
      recent_improvement=v_recent_improvement,uncertainty=v_uncertainty,
      curriculum_topic_key=coalesce(v_existing.curriculum_topic_key,nullif(trim(p_curriculum_topic_key),''))
    where id=v_existing.id;
  end if;
  return true;
end;
$$;

revoke all on function public.project_exam_topic_mastery(uuid,text,text,text,numeric,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.project_exam_topic_mastery(uuid,text,text,text,numeric,timestamptz,text,text) to service_role;
