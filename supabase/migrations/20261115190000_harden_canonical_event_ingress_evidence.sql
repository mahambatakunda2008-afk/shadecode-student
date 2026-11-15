-- Canonical event ingress accepts authenticated browser events for durable
-- telemetry. It must never accept browser-authored correctness/marking claims
-- as mastery evidence. Verified assessments write their evidence through
-- server-owned assessment transactions instead.

create or replace function public.insert_canonical_cortex_event(
  p_user_id uuid,
  p_event jsonb
)
returns public.cortex_events
language plpgsql
set search_path to 'public'
as $function$
declare
  result public.cortex_events;
  safe_event jsonb := p_event;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  if coalesce(safe_event->>'eventId', '') = '' or coalesce(safe_event->>'sourceEventId', '') = '' then
    raise exception 'canonical event identity is required';
  end if;

  -- Authenticated browser RPC callers bypass the HTTP event route, so strip
  -- all mastery-driving fields. The only trusted nested caller is the
  -- SECURITY DEFINER complete_lesson_quiz_attempt() transaction, whose
  -- effective current_user is postgres and whose answer key is server-owned.
  if current_user <> 'postgres' and jsonb_typeof(safe_event->'metadata') = 'object' then
    safe_event := jsonb_set(
      safe_event,
      '{metadata}',
      (safe_event->'metadata') - array[
        'correct',
        'evidenceScore',
        'percentage',
        'score',
        'maxScore',
        'confidence',
        'responseSeconds',
        'difficulty',
        'verified',
        'serverVerified',
        'teacherReviewed',
        'reviewerId',
        'evidenceClass',
        'markingAuthority',
        'markingMethod',
        'answerKeyVersion',
        'questionSetHash',
        'marksAwarded'
      ]::text[],
      true
    );
  end if;

  insert into public.cortex_events (user_id, type, source, data)
  values (p_user_id, safe_event->>'kind', safe_event->>'source', safe_event)
  on conflict ((data->>'eventId')) where (data ? 'eventId') do nothing
  returning * into result;

  if result.id is null then
    select * into result
    from public.cortex_events
    where user_id = p_user_id
      and data->>'eventId' = safe_event->>'eventId'
    limit 1;
  end if;

  return result;
end;
$function$;

revoke all on function public.insert_canonical_cortex_event(uuid,jsonb) from public, anon;
grant execute on function public.insert_canonical_cortex_event(uuid,jsonb) to authenticated;
