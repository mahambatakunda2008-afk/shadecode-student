-- Root cause of "The lesson was generated but could not be finalized safely" (run e3a75aa5 and others).
--
-- bridge_learn_lesson_completion_to_cortex_event() hashed with chr(0) as a separator. PostgreSQL text cannot
-- contain U+0000, so every UPDATE that moved a lesson's progress from <100 to 100 raised
-- "null character not permitted" (54000). That aborted the atomic finalize in checkpoint_cortex_generation()
-- (the lesson row already exists from the earlier partial save, so the final save takes the UPDATE path) and
-- also blocked students completing a lesson. The failure was independent of lesson content.
--
-- Fix: use chr(31) (unit separator) as the separator. The previous scheme never succeeded, so no existing
-- event ids depend on it. (Note: src/lib/intelligence/learningEvents.ts canonicalEventId uses a different hash,
-- so these ids never matched the TypeScript ones; unchanged here, tracked separately.)
-- Already applied to production via the Supabase MCP; this file keeps the repo in sync.
create or replace function public.bridge_learn_lesson_completion_to_cortex_event()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  source_event_id text;
  event_id text;
  subject_name text;
begin
  if coalesce(old.progress, 0) < 100 and new.progress >= 100 then
    source_event_id := 'lesson-complete:' || new.id::text;
    event_id := 'le_' || md5(new.user_id::text || chr(31) || 'learn' || chr(31) || source_event_id);

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
$function$;
