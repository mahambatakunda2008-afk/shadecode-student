alter table public.cortex_memory
  add column if not exists last_practice_subject text;

comment on column public.cortex_memory.last_practice_subject is
  'Subject name associated with the most recent verified practice score; used to prevent cross-subject context leakage.';
