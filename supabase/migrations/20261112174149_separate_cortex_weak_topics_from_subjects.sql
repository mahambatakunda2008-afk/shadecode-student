alter table public.cortex_memory
  add column if not exists weak_topics jsonb not null default '[]'::jsonb;

comment on column public.cortex_memory.weak_subjects is
  'Subject-level weaknesses derived from formal assessment history.';
comment on column public.cortex_memory.weak_topics is
  'Topic-level weaknesses derived from practice and topic-level learning evidence.';
