create table if not exists public.cortex_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  source text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cortex_events_user_created_idx
  on public.cortex_events(user_id, created_at desc);

create index if not exists cortex_events_user_type_idx
  on public.cortex_events(user_id, type, created_at desc);

alter table public.cortex_events enable row level security;

create policy "cortex_events_select_own"
  on public.cortex_events for select
  using (auth.uid() = user_id);

create policy "cortex_events_insert_own"
  on public.cortex_events for insert
  with check (auth.uid() = user_id);
