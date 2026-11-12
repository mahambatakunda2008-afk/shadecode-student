create table if not exists public.canonical_learning_projection_ledger (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  subject text not null,
  topic text not null,
  projected_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.canonical_learning_projection_ledger enable row level security;
revoke all on public.canonical_learning_projection_ledger from public, anon, authenticated;
grant all on public.canonical_learning_projection_ledger to service_role;
drop policy if exists canonical_learning_projection_ledger_service_role_all on public.canonical_learning_projection_ledger;
create policy canonical_learning_projection_ledger_service_role_all
  on public.canonical_learning_projection_ledger for all to service_role
  using (true) with check (true);

CREATE OR REPLACE FUNCTION public.project_canonical_learning_observation(p_user_id uuid, p_event_id text, p_subject text, p_topic text, p_evidence_score numeric, p_correct boolean, p_confidence numeric DEFAULT NULL::numeric, p_response_seconds numeric DEFAULT NULL::numeric, p_observed_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
  v_recent_improvement numeric;
  v_uncertainty numeric;
  v_attempts integer;
  v_last_score numeric;
  v_trend numeric;
  v_correct numeric;
  v_response numeric;
  v_observed timestamp without time zone;
begin
  if p_user_id is null
    or nullif(trim(p_event_id), '') is null
    or nullif(trim(p_subject), '') is null
    or nullif(trim(p_topic), '') is null
    or p_evidence_score is null
    or p_evidence_score < 0 or p_evidence_score > 100
    or p_correct is null
    or (p_confidence is not null and (p_confidence < 0 or p_confidence > 100))
    or (p_response_seconds is not null and p_response_seconds < 0) then
    raise exception 'Invalid canonical learning observation';
  end if;

  -- Serialize every observation for this learner/topic before checking either
  -- the idempotency ledger or the mutable topic row. This also protects the
  -- first observation when the topic_mastery row does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || ':' || trim(p_subject) || ':' || trim(p_topic), 0
  ));

  insert into public.canonical_learning_projection_ledger(user_id,event_id,subject,topic)
  values (p_user_id,trim(p_event_id),trim(p_subject),trim(p_topic))
  on conflict (user_id,event_id) do nothing;
  if not found then
    return false;
  end if;

  select * into v_existing
  from public.topic_mastery
  where user_id=p_user_id and subject=trim(p_subject) and topic=trim(p_topic)
  for update;
  v_exists := found;

  v_correct := case when p_correct then 100 else 0 end;
  v_response := case when p_response_seconds is null then 50
    else greatest(0,least(100,100 - p_response_seconds / 3)) end;
  v_observed := coalesce(p_observed_at,now())::timestamp without time zone;

  if not v_exists then
    v_previous_mastery := 50;
    v_mastery := round(p_evidence_score,2);
    v_retention := greatest(0,least(100,50 + case when p_correct then 1.5 else -2 end));
    v_confidence := greatest(0,least(100,50 * 0.8 + coalesce(p_confidence,50) * 0.2));
    v_stability := greatest(0,least(100,50 + case when p_correct then 1 else -1 end));
    v_exposure := 1;
    v_error_rate := 50 * 0.85 + v_correct * 0.15;
    v_response_speed := v_response;
    v_recent_improvement := greatest(-100,least(100,v_mastery - 50));
    v_uncertainty := 80 * 0.92;
    v_attempts := 1;
    v_last_score := p_evidence_score;
    v_trend := 0;
    insert into public.topic_mastery(
      user_id,subject,topic,mastery_score,last_score,attempts,trend,last_attempted,
      retention,confidence,stability,exposure,error_rate,response_speed,
      prerequisite_health,recent_improvement,uncertainty
    ) values (
      p_user_id,trim(p_subject),trim(p_topic),v_mastery,v_last_score,v_attempts,v_trend,v_observed,
      v_retention,v_confidence,v_stability,v_exposure,v_error_rate,v_response_speed,
      50,v_recent_improvement,v_uncertainty
    );
  else
    v_previous_mastery := coalesce(v_existing.mastery_score,0);
    v_mastery := round(v_previous_mastery * 0.7 + p_evidence_score * 0.3,2);
    v_retention := greatest(0,least(100,v_existing.retention + case when p_correct then 1.5 else -2 end));
    v_confidence := greatest(0,least(100,v_existing.confidence * 0.8 + coalesce(p_confidence,v_existing.confidence) * 0.2));
    v_stability := greatest(0,least(100,v_existing.stability + case when p_correct then 1 else -1 end));
    v_exposure := greatest(0,coalesce(v_existing.exposure,0))+1;
    v_error_rate := greatest(0,least(100,v_existing.error_rate * 0.85 + v_correct * 0.15));
    v_response_speed := case when p_response_seconds is null then v_existing.response_speed else v_response end;
    v_recent_improvement := greatest(-100,least(100,v_mastery-v_previous_mastery));
    v_uncertainty := greatest(0,least(100,v_existing.uncertainty*0.92));
    v_attempts := greatest(0,coalesce(v_existing.attempts,0))+1;
    v_last_score := p_evidence_score;
    v_trend := v_mastery-v_previous_mastery;

    update public.topic_mastery set
      mastery_score=v_mastery,last_score=v_last_score,attempts=v_attempts,trend=v_trend,
      last_attempted=v_observed,retention=v_retention,confidence=v_confidence,
      stability=v_stability,exposure=v_exposure,error_rate=v_error_rate,
      response_speed=v_response_speed,recent_improvement=v_recent_improvement,
      uncertainty=v_uncertainty
    where id=v_existing.id;
  end if;

  return true;
end;
$function$
;

revoke all on function public.project_canonical_learning_observation(uuid,text,text,text,numeric,boolean,numeric,numeric,timestamptz)
  from public, anon, authenticated;
grant execute on function public.project_canonical_learning_observation(uuid,text,text,text,numeric,boolean,numeric,numeric,timestamptz)
  to service_role;
