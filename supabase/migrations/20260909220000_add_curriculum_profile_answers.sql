alter table public.profiles
  add column if not exists curriculum_profile jsonb;

comment on column public.profiles.curriculum_profile is
  'User-provided curriculum context, including incomplete or unknown fields. This is input, not verified curriculum authority.';
