create table if not exists public.paper_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null,
  mime_type text not null default 'application/pdf',
  source_size_bytes bigint,
  page_count integer not null default 0,
  selected_page_start integer not null default 1,
  selected_page_end integer not null default 1,
  status text not null default 'processed' check (status in ('processing','processed','failed')),
  source_metadata jsonb not null default '{}'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  learning_plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paper_learning_sessions_page_range_check check (
    selected_page_start >= 1 and selected_page_end >= selected_page_start
  )
);

create index if not exists paper_learning_sessions_user_updated_idx
  on public.paper_learning_sessions(user_id, updated_at desc);

alter table public.paper_learning_sessions enable row level security;

create policy "paper learning sessions are readable by owner"
  on public.paper_learning_sessions for select
  using (auth.uid() = user_id);

create policy "paper learning sessions are insertable by owner"
  on public.paper_learning_sessions for insert
  with check (auth.uid() = user_id);

create policy "paper learning sessions are updateable by owner"
  on public.paper_learning_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paper learning sessions are deletable by owner"
  on public.paper_learning_sessions for delete
  using (auth.uid() = user_id);

create or replace function public.set_paper_learning_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists paper_learning_sessions_updated_at on public.paper_learning_sessions;
create trigger paper_learning_sessions_updated_at
before update on public.paper_learning_sessions
for each row execute function public.set_paper_learning_session_updated_at();
