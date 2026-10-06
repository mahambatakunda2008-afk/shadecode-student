-- Additive: lets topic_mastery rows reference a verified curriculum subsection.
-- Applied to production via MCP on 2026-10-05 (table was empty at the time).
alter table public.topic_mastery
  add column if not exists syllabus_id text,
  add column if not exists curriculum_topic_key text;

comment on column public.topic_mastery.syllabus_id is 'Curriculum syllabus the topic was resolved against (e.g. cambridge-9702). Null when the free-text topic could not be resolved unambiguously.';
comment on column public.topic_mastery.curriculum_topic_key is 'Verified curriculum subsection key (e.g. 1.1) from curriculum_knowledge. Null when unresolved.';

create index if not exists topic_mastery_curriculum_key_idx
  on public.topic_mastery (user_id, syllabus_id, curriculum_topic_key)
  where curriculum_topic_key is not null;

-- One row per verified subsection, used by the topic resolver (src/lib/topicMastery).
create or replace view public.curriculum_topic_units
with (security_invoker = true) as
select distinct
  syllabus_id,
  subject_id,
  topic_key,
  split_part(title, ': outcome ', 1) as title
from public.curriculum_knowledge
where kind = 'learning_outcome'
  and status = 'verified'
  and topic_key is not null;

grant select on public.curriculum_topic_units to anon, authenticated, service_role;

-- Adds `level` (as_level | a_level) so paper scope can restrict AS papers to AS content.
-- Each subsection key has exactly one level across 9700/9701/9702/9709.
create or replace view public.curriculum_topic_units
with (security_invoker = true) as
select distinct
  syllabus_id,
  subject_id,
  topic_key,
  split_part(title, ': outcome ', 1) as title,
  level
from public.curriculum_knowledge
where kind = 'learning_outcome'
  and status = 'verified'
  and topic_key is not null;

grant select on public.curriculum_topic_units to anon, authenticated, service_role;
