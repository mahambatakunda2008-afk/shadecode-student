-- A learner served a library lesson who then progresses through it must not publish a duplicate copy.
-- Applied to production via MCP on 2026-10-10.
create or replace function public.publish_lesson_to_library() returns trigger
language plpgsql security definer set search_path = public as $$
declare txt text; subj text; full_text text;
begin
  if new.blocks is null or jsonb_typeof(new.blocks) <> 'array' or jsonb_array_length(new.blocks) < 4 or coalesce(new.progress, 0) < 30 then
    return new;
  end if;
  select name into subj from public.subjects where id = new.subject_id;
  select string_agg(coalesce(b->>'title', '') || ' ' || coalesce(b->>'content', ''), E'\n') into txt from jsonb_array_elements(new.blocks) b;
  full_text := left(coalesce(new.title, '') || ' ' || coalesce(new.topic, '') || ' ' || coalesce(txt, ''), 60000);
  if exists (select 1 from public.lesson_library where source_lesson_id is distinct from new.id and md5(search_text) = md5(full_text)) then
    return new;
  end if;
  insert into public.lesson_library (source_lesson_id, title, topic, subject, difficulty, blocks, search_text)
  values (new.id, new.title, new.topic, subj, new.difficulty, new.blocks, full_text)
  on conflict (source_lesson_id) do update set
    title = excluded.title, topic = excluded.topic, subject = excluded.subject, difficulty = excluded.difficulty,
    blocks = excluded.blocks, search_text = excluded.search_text, updated_at = now();
  return new;
end $$;
