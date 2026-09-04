-- Carry the durable Learn topic into the canonical completion event.
create or replace function public.bridge_learn_lesson_completion_to_cortex_event()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  source_event_id text;
  event_id text;
  subject_name text;
begin
  if coalesce(old.progress, 0) < 100 and new.progress >= 100 then
    source_event_id := 'lesson-complete:' || new.id::text;
    event_id := 'le_' || md5(new.user_id::text || chr(0) || 'learn' || chr(0) || source_event_id);

    select s.name into subject_name
    from public.subjects s
    where s.id = new.subject_id
      and s.user_id = new.user_id
    limit 1;

    insert into public.cortex_events (user_id, type, source, data)
    values (
      new.user_id,
      'lesson.completed',
      'learn',
      jsonb_build_object(
        'eventId', event_id,
        'sourceEventId', source_event_id,
        'occurredAt', coalesce(new.updated_at, now()),
        'subjectId', new.subject_id,
        'topicId', nullif(trim(coalesce(new.topic, '')), ''),
        'entityId', new.id,
        'metadata', jsonb_build_object(
          'bridge', true,
          'completionTransition', true,
          'subject', subject_name
        )
      )
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

comment on function public.bridge_learn_lesson_completion_to_cortex_event() is
  'Bridges Learn lesson completion into canonical Cortex events, preserving subject and durable topic identity.';
