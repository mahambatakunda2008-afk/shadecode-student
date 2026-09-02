-- Bridge legacy Learn lesson completion writes into the durable canonical event stream.
--
-- The current Learn PATCH path persists progress directly. Until that client path is
-- migrated to emit canonical events itself, this transition trigger guarantees that
-- the important 0..99 -> 100 state change is not lost, including offline progress
-- that syncs later. It is intentionally completion-transition-only and idempotent.
-- It does not mutate topic_mastery. The canonical event stream remains evidence;
-- mastery projection is handled by the intelligence layer.

create or replace function public.bridge_learn_lesson_completion_to_cortex_event()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  source_event_id text;
  event_id text;
begin
  if coalesce(old.progress, 0) < 100 and new.progress >= 100 then
    source_event_id := 'lesson-complete:' || new.id::text;
    event_id := 'le_' || md5(new.user_id::text || chr(0) || 'learn' || chr(0) || source_event_id);

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
        'entityId', new.id,
        'metadata', jsonb_build_object('bridge', true, 'completionTransition', true)
      )
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists learn_lesson_completion_cortex_event on public.learn_lessons;

create trigger learn_lesson_completion_cortex_event
after update of progress on public.learn_lessons
for each row
when (coalesce(old.progress, 0) < 100 and new.progress >= 100)
execute function public.bridge_learn_lesson_completion_to_cortex_event();

revoke all on function public.bridge_learn_lesson_completion_to_cortex_event() from public;
