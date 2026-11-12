-- Durable, authenticated account-deletion request queue.
-- This migration does NOT delete user data. A separately reviewed worker must
-- perform the full database, Storage, processor and local-device cleanup.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'completed')),
  requested_at timestamptz not null default now(),
  requested_auth_time timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  updated_at timestamptz not null default now()
);

comment on table public.account_deletion_requests is
  'Minimal durable queue for account deletion. Requests are created only through request_account_deletion(); no automatic deletion is performed by this table.';

create index if not exists account_deletion_requests_user_requested_idx
  on public.account_deletion_requests (user_id, requested_at desc);

create unique index if not exists account_deletion_requests_one_active_per_user_idx
  on public.account_deletion_requests (user_id)
  where user_id is not null and status in ('pending', 'processing', 'failed');

alter table public.account_deletion_requests enable row level security;

-- No direct table access for browser roles. The signed-in user invokes only
-- the narrow RPC below; service_role will be used by the future worker.
revoke all on table public.account_deletion_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_requests to service_role;

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_jwt jsonb := auth.jwt();
  v_auth_time bigint;
  v_existing_id uuid;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  begin
    v_auth_time := nullif(v_jwt ->> 'auth_time', '')::bigint;
  exception when others then
    v_auth_time := null;
  end;

  -- Require a fresh authentication event. The client cannot supply or forge
  -- this timestamp; it is read from the signed Supabase JWT.
  if v_auth_time is null
     or to_timestamp(v_auth_time) < now() - interval '15 minutes'
     or to_timestamp(v_auth_time) > now() + interval '60 seconds' then
    raise exception using errcode = '28000', message = 'Recent re-authentication required';
  end if;

  select id
    into v_existing_id
    from public.account_deletion_requests
   where user_id = v_user_id
     and status in ('pending', 'processing', 'failed')
   order by requested_at desc
   limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.account_deletion_requests (user_id, requested_auth_time)
  values (v_user_id, to_timestamp(v_auth_time))
  returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    select id
      into v_existing_id
      from public.account_deletion_requests
     where user_id = v_user_id
       and status in ('pending', 'processing', 'failed')
     order by requested_at desc
     limit 1;
    if v_existing_id is not null then
      return v_existing_id;
    end if;
    raise;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated, service_role;
