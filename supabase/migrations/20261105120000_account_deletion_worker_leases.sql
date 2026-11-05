-- Atomic lease/claim mechanics for the future account-deletion worker.
-- These functions only claim/release queue jobs. They do not delete account data.

alter table public.account_deletion_requests
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz;

create index if not exists account_deletion_requests_claim_idx
  on public.account_deletion_requests (status, requested_at)
  where status in ('pending', 'processing');

create or replace function public.claim_account_deletion_request(
  p_lease_seconds integer default 300
)
returns table (
  request_id uuid,
  user_id uuid,
  lease_token uuid,
  attempt_count integer,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lease_seconds integer := greatest(30, least(coalesce(p_lease_seconds, 300), 900));
begin
  return query
  with candidate as (
    select r.id
    from public.account_deletion_requests r
    where r.user_id is not null
      and (
        r.status = 'pending'
        or (
          r.status = 'processing'
          and r.lease_expires_at is not null
          and r.lease_expires_at < now()
        )
      )
    order by r.requested_at asc
    for update skip locked
    limit 1
  )
  update public.account_deletion_requests r
     set status = 'processing',
         started_at = coalesce(r.started_at, now()),
         attempt_count = r.attempt_count + 1,
         lease_token = gen_random_uuid(),
         lease_expires_at = now() + make_interval(secs => v_lease_seconds),
         updated_at = now(),
         last_error_code = null
    from candidate c
   where r.id = c.id
  returning r.id, r.user_id, r.lease_token, r.attempt_count, r.lease_expires_at;
end;
$$;

create or replace function public.release_account_deletion_request(
  p_request_id uuid,
  p_lease_token uuid,
  p_error_code text,
  p_retry boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_safe_error_code text := left(
    regexp_replace(coalesce(p_error_code, 'worker_error'), '[^a-zA-Z0-9_.-]', '_', 'g'),
    64
  );
begin
  if p_request_id is null or p_lease_token is null then
    return false;
  end if;

  update public.account_deletion_requests
     set status = case when coalesce(p_retry, true) then 'pending' else 'failed' end,
         lease_token = null,
         lease_expires_at = null,
         last_error_code = v_safe_error_code,
         updated_at = now()
   where id = p_request_id
     and status = 'processing'
     and lease_token = p_lease_token;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.claim_account_deletion_request(integer) from public, anon, authenticated;
revoke all on function public.release_account_deletion_request(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_account_deletion_request(integer) to service_role;
grant execute on function public.release_account_deletion_request(uuid, uuid, text, boolean) to service_role;

comment on function public.claim_account_deletion_request(integer) is
  'Atomically leases one pending or expired-processing account deletion request. Service role only; no user data is deleted.';
comment on function public.release_account_deletion_request(uuid, uuid, text, boolean) is
  'Releases a matching worker lease and requeues or fails the request. Service role only; no user data is deleted.';
