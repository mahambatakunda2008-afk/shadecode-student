-- Canonical academic profile for stage-aware product behaviour and AI grounding.
-- Keep study_level as the compatibility field while new clients migrate.

alter table public.profiles
  add column if not exists education_stage text,
  add column if not exists curriculum_board text,
  add column if not exists qualification text,
  add column if not exists syllabus_code text,
  add column if not exists syllabus_year text;

alter table public.profiles
  drop constraint if exists profiles_education_stage_check;

alter table public.profiles
  add constraint profiles_education_stage_check
  check (education_stage is null or education_stage in (
    'primary', 'lower_secondary', 'upper_secondary', 'advanced_secondary', 'tertiary'
  ));

alter table public.profiles
  drop constraint if exists profiles_curriculum_board_check;

alter table public.profiles
  add constraint profiles_curriculum_board_check
  check (curriculum_board is null or curriculum_board in (
    'cambridge', 'zimsec', 'pearson_edexcel', 'aqa', 'ocr', 'ib', 'waec', 'custom'
  ));

create index if not exists profiles_education_stage_idx
  on public.profiles (education_stage);

create index if not exists profiles_curriculum_board_idx
  on public.profiles (curriculum_board);

-- Safely backfill the canonical stage from the existing granular study_level.
update public.profiles
set education_stage = case
  when lower(coalesce(study_level, '')) in ('primary', 'early-primary', 'upper-primary') then 'primary'
  when lower(coalesce(study_level, '')) in ('lower-secondary', 'junior-secondary') then 'lower_secondary'
  when lower(coalesce(study_level, '')) in ('upper-secondary', 'high-school', 'secondary') then 'upper_secondary'
  when lower(coalesce(study_level, '')) in ('a-level', 'as-level', 'a2', 'sixth-form', 'advanced-secondary') then 'advanced_secondary'
  when lower(coalesce(study_level, '')) in ('university', 'polytechnic', 'tvet', 'college', 'professional') then 'tertiary'
  else education_stage
end
where education_stage is null;
