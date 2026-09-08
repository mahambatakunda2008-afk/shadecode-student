-- Primary / Discovery foundation
-- Source-of-truth migration for the Primary curriculum/activity model.
-- This migration is intentionally idempotent because the foundation was initially
-- provisioned directly in the connected Supabase project before being checked into git.

create table if not exists public.primary_curriculum_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  board text not null,
  country_code text not null,
  stage text not null default 'primary',
  grade text not null,
  version text not null default '1.0',
  language_codes text[] not null default array['en']::text[],
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.primary_activities (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.primary_curriculum_packs(id) on delete cascade,
  subject text not null,
  topic text not null,
  skill text not null,
  activity_type text not null check (
    activity_type in (
      'reading', 'phonics', 'math', 'science', 'language',
      'story', 'puzzle', 'reasoning', 'listen_respond'
    )
  ),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  offline_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.primary_activity_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.primary_activities(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create index if not exists primary_activities_pack_order_idx
  on public.primary_activities (pack_id, sort_order);

create index if not exists primary_activity_progress_user_updated_idx
  on public.primary_activity_progress (user_id, updated_at desc);

alter table public.primary_curriculum_packs enable row level security;
alter table public.primary_activities enable row level security;
alter table public.primary_activity_progress enable row level security;

drop policy if exists "Authenticated users can read active primary packs" on public.primary_curriculum_packs;
create policy "Authenticated users can read active primary packs"
  on public.primary_curriculum_packs
  for select
  to authenticated
  using (active = true);

drop policy if exists "Authenticated users can read active primary activities" on public.primary_activities;
create policy "Authenticated users can read active primary activities"
  on public.primary_activities
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.primary_curriculum_packs p
      where p.id = primary_activities.pack_id
        and p.active = true
    )
  );

drop policy if exists "Users can read own primary progress" on public.primary_activity_progress;
create policy "Users can read own primary progress"
  on public.primary_activity_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own primary progress" on public.primary_activity_progress;
create policy "Users can insert own primary progress"
  on public.primary_activity_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own primary progress" on public.primary_activity_progress;
create policy "Users can update own primary progress"
  on public.primary_activity_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into public.primary_curriculum_packs (
  name, board, country_code, stage, grade, version, language_codes, active
)
select
  'ZIMSEC Primary Mathematics', 'ZIMSEC', 'ZW', 'primary', 'Grade 4', '1.0', array['en']::text[], true
where not exists (
  select 1
  from public.primary_curriculum_packs
  where board = 'ZIMSEC'
    and country_code = 'ZW'
    and grade = 'Grade 4'
    and name = 'ZIMSEC Primary Mathematics'
);

insert into public.primary_activities (
  pack_id, subject, topic, skill, activity_type, title, content, sort_order, offline_ready
)
select
  p.id,
  'Mathematics',
  'Place Value',
  'Read and represent whole numbers by place value',
  'math',
  'Place Value Explorer',
  '{"kind":"place_value","maxNumber":9999,"instructions":"Build a number and discover what each digit means."}'::jsonb,
  10,
  true
from public.primary_curriculum_packs p
where p.name = 'ZIMSEC Primary Mathematics'
  and p.board = 'ZIMSEC'
  and p.country_code = 'ZW'
  and p.grade = 'Grade 4'
  and not exists (
    select 1 from public.primary_activities a
    where a.pack_id = p.id and a.title = 'Place Value Explorer'
  );

insert into public.primary_activities (
  pack_id, subject, topic, skill, activity_type, title, content, sort_order, offline_ready
)
select
  p.id,
  'Mathematics',
  'Mental Mathematics',
  'Solve short whole-number calculations efficiently',
  'puzzle',
  'Number Sprint',
  '{"kind":"number_sprint","operations":["addition","subtraction"],"questionCount":5,"instructions":"Solve each number challenge and keep your streak going."}'::jsonb,
  20,
  true
from public.primary_curriculum_packs p
where p.name = 'ZIMSEC Primary Mathematics'
  and p.board = 'ZIMSEC'
  and p.country_code = 'ZW'
  and p.grade = 'Grade 4'
  and not exists (
    select 1 from public.primary_activities a
    where a.pack_id = p.id and a.title = 'Number Sprint'
  );
