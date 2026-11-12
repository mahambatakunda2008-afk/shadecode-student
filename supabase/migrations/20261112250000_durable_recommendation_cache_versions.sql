create table if not exists public.recommendation_cache_versions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.recommendation_cache_invalidation_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,event_id)
);
alter table public.recommendation_cache_versions enable row level security;
alter table public.recommendation_cache_invalidation_events enable row level security;
revoke all on public.recommendation_cache_versions from public,anon,authenticated;
revoke all on public.recommendation_cache_invalidation_events from public,anon,authenticated;
grant select on public.recommendation_cache_versions to authenticated;
grant all on public.recommendation_cache_versions to service_role;
grant all on public.recommendation_cache_invalidation_events to service_role;
drop policy if exists recommendation_cache_versions_owner_read on public.recommendation_cache_versions;
create policy recommendation_cache_versions_owner_read on public.recommendation_cache_versions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists recommendation_cache_versions_service_all on public.recommendation_cache_versions;
create policy recommendation_cache_versions_service_all on public.recommendation_cache_versions
  for all to service_role using (true) with check (true);
drop policy if exists recommendation_cache_invalidation_events_service_all on public.recommendation_cache_invalidation_events;
create policy recommendation_cache_invalidation_events_service_all on public.recommendation_cache_invalidation_events
  for all to service_role using (true) with check (true);

create or replace function public.invalidate_recommendation_cache(
  p_user_id uuid,
  p_event_id uuid
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inserted boolean;
  v_version bigint;
begin
  if p_user_id is null or p_event_id is null then
    raise exception 'User and event identity are required';
  end if;

  insert into public.recommendation_cache_invalidation_events(user_id,event_id)
  values(p_user_id,p_event_id)
  on conflict do nothing;
  v_inserted := found;

  insert into public.recommendation_cache_versions(user_id,version,updated_at)
  values(p_user_id,case when v_inserted then 1 else 0 end,now())
  on conflict(user_id) do update
    set version = public.recommendation_cache_versions.version + case when v_inserted then 1 else 0 end,
        updated_at = case when v_inserted then now() else public.recommendation_cache_versions.updated_at end
  returning version into v_version;

  return v_version;
end;
$$;
revoke all on function public.invalidate_recommendation_cache(uuid,uuid) from public,anon,authenticated;
grant execute on function public.invalidate_recommendation_cache(uuid,uuid) to service_role;
