-- Canonical Cortex event ingress is an evidence boundary, not a mastery reducer.
-- Mastery must be updated by one authoritative state-transition algorithm.
-- Keeping this RPC persistence-only prevents exam scoring and event replay from
-- mutating topic_mastery twice through different heuristics.

create or replace function public.insert_canonical_cortex_event(p_user_id uuid, p_event jsonb)
returns public.cortex_events
language plpgsql
set search_path to 'public'
as $function$
declare
  result public.cortex_events;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  if coalesce(p_event->>'eventId', '') = '' or coalesce(p_event->>'sourceEventId', '') = '' then
    raise exception 'canonical event identity is required';
  end if;

  insert into public.cortex_events (user_id, type, source, data)
  values (p_user_id, p_event->>'kind', p_event->>'source', p_event)
  on conflict ((data->>'eventId')) where (data ? 'eventId') do nothing
  returning * into result;

  if result.id is null then
    select * into result
    from public.cortex_events
    where user_id = p_user_id
      and data->>'eventId' = p_event->>'eventId'
    limit 1;
  end if;

  return result;
end;
$function$;
