alter table public.cortex_memory
  add column if not exists last_practice_syllabus_id text;

comment on column public.cortex_memory.last_practice_syllabus_id is
  'Verified syllabus identity associated with the most recent practice score.';
