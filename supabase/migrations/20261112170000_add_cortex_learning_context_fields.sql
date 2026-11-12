alter table public.cortex_memory
  add column if not exists last_topic text,
  add column if not exists last_practice_score numeric,
  add column if not exists last_practice_topic text,
  add column if not exists last_feedback text;

comment on column public.cortex_memory.last_topic is
  'Most recently opened learning topic; does not imply a completed study session.';
comment on column public.cortex_memory.last_practice_score is
  'Most recent deterministic practice score, separate from formal exam results.';
comment on column public.cortex_memory.last_practice_topic is
  'Topic associated with the most recent practice score.';
comment on column public.cortex_memory.last_feedback is
  'Most recent short, user-submitted learning feedback.';
