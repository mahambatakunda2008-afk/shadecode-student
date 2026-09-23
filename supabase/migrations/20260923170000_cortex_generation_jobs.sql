-- Durable Cortex generation jobs
-- Keeps generation identity and recovery state outside the browser.
create table if not exists public.cortex_generation_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lesson','course','revision','exam')),
  status text not null check (status in ('queued','warming','generating','partial','complete','failed','cancelled')),
  stage text not null default 'queued',
  request jsonb not null default '{}'::jsonb,
  partial jsonb,
  result jsonb,
  error jsonb,
  progress integer not null default 0 check (progress between 0 and 100),
  completed_units integer not null default 0 check (completed_units >= 0),
  total_units integer not null default 0 check (total_units >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cortex_generation_jobs_user_updated_idx
  on public.cortex_generation_jobs(user_id, updated_at desc);

create index if not exists cortex_generation_jobs_active_idx
  on public.cortex_generation_jobs(user_id, status)
  where status in ('queued','warming','generating','partial');

alter table public.cortex_generation_jobs enable row level security;

drop policy if exists "cortex_generation_jobs_select_own" on public.cortex_generation_jobs;
create policy "cortex_generation_jobs_select_own"
on public.cortex_generation_jobs for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "cortex_generation_jobs_insert_own" on public.cortex_generation_jobs;
create policy "cortex_generation_jobs_insert_own"
on public.cortex_generation_jobs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "cortex_generation_jobs_update_own" on public.cortex_generation_jobs;
create policy "cortex_generation_jobs_update_own"
on public.cortex_generation_jobs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.cortex_generation_jobs from anon;
grant select, insert, update on public.cortex_generation_jobs to authenticated;
