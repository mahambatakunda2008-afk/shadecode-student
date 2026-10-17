-- Lesson library: lessons learners actually progressed through (validated by use), shared and searchable.
-- Applied to production via MCP on 2026-10-10. Lesson text is generated educational content; no user ids are stored.
create table if not exists public.lesson_library (
  id uuid primary key default gen_random_uuid(),
  source_lesson_id uuid unique,
  title text not null,
  topic text,
  subject text,
  difficulty text,
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array'),
  search_text text not null,
  helpful_up integer not null default 0 check (helpful_up >= 0),
  helpful_down integer not null default 0 check (helpful_down >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lesson_library enable row level security;
create policy "Anyone can read the lesson library" on public.lesson_library for select to anon, authenticated using (true);

create table if not exists public.lesson_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lesson_library(id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_votes enable row level security;
create policy "Users manage own lesson votes" on public.lesson_votes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.publish_lesson_to_library() returns trigger
language plpgsql security definer set search_path = public as $$
declare txt text; subj text;
begin
  if new.blocks is null or jsonb_typeof(new.blocks) <> 'array' or jsonb_array_length(new.blocks) < 4 or coalesce(new.progress, 0) < 30 then
    return new;
  end if;
  select name into subj from public.subjects where id = new.subject_id;
  select string_agg(coalesce(b->>'title', '') || ' ' || coalesce(b->>'content', ''), E'\n') into txt from jsonb_array_elements(new.blocks) b;
  insert into public.lesson_library (source_lesson_id, title, topic, subject, difficulty, blocks, search_text)
  values (new.id, new.title, new.topic, subj, new.difficulty, new.blocks, left(coalesce(new.title, '') || ' ' || coalesce(new.topic, '') || ' ' || coalesce(txt, ''), 60000))
  on conflict (source_lesson_id) do update set
    title = excluded.title, topic = excluded.topic, subject = excluded.subject, difficulty = excluded.difficulty,
    blocks = excluded.blocks, search_text = excluded.search_text, updated_at = now();
  return new;
end $$;
drop trigger if exists learn_lessons_publish_to_library on public.learn_lessons;
create trigger learn_lessons_publish_to_library after insert or update of progress, blocks on public.learn_lessons
  for each row execute function public.publish_lesson_to_library();

create or replace function public.apply_lesson_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.lesson_library set helpful_up = greatest(0, helpful_up - (case when old.helpful then 1 else 0 end)),
      helpful_down = greatest(0, helpful_down - (case when old.helpful then 0 else 1 end)) where id = old.lesson_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.lesson_library set helpful_up = helpful_up + (case when new.helpful then 1 else 0 end),
      helpful_down = helpful_down + (case when new.helpful then 0 else 1 end) where id = new.lesson_id;
  end if;
  return null;
end $$;
drop trigger if exists lesson_votes_apply on public.lesson_votes;
create trigger lesson_votes_apply after insert or update or delete on public.lesson_votes for each row execute function public.apply_lesson_vote();

-- Backfill: lessons already used.
insert into public.lesson_library (source_lesson_id, title, topic, subject, difficulty, blocks, search_text)
select l.id, l.title, l.topic, s.name, l.difficulty, l.blocks,
  left(coalesce(l.title, '') || ' ' || coalesce(l.topic, '') || ' ' || coalesce((select string_agg(coalesce(b->>'title', '') || ' ' || coalesce(b->>'content', ''), E'\n') from jsonb_array_elements(l.blocks) b), ''), 60000)
from public.learn_lessons l left join public.subjects s on s.id = l.subject_id
where jsonb_typeof(l.blocks) = 'array' and jsonb_array_length(l.blocks) >= 4 and coalesce(l.progress, 0) >= 30
on conflict (source_lesson_id) do nothing;
