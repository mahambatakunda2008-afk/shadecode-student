create table if not exists public.academic_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pathway text not null check (pathway in ('university','tvet','college','professional')),
  institution text,
  programme text not null,
  year_level text,
  semester text,
  courses text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_contexts enable row level security;

grant select, insert, update, delete on public.academic_contexts to authenticated;

drop policy if exists "academic_contexts_select_own" on public.academic_contexts;
drop policy if exists "academic_contexts_insert_own" on public.academic_contexts;
drop policy if exists "academic_contexts_update_own" on public.academic_contexts;
drop policy if exists "academic_contexts_delete_own" on public.academic_contexts;

create policy "academic_contexts_select_own"
  on public.academic_contexts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "academic_contexts_insert_own"
  on public.academic_contexts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "academic_contexts_update_own"
  on public.academic_contexts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "academic_contexts_delete_own"
  on public.academic_contexts for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_academic_contexts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academic_contexts_updated_at on public.academic_contexts;
create trigger academic_contexts_updated_at
  before update on public.academic_contexts
  for each row execute function public.set_academic_contexts_updated_at();
