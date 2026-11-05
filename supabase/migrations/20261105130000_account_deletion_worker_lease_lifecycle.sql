-- Lease heartbeat and crash recovery for account-deletion jobs.
-- Completion is only possible after the Auth FK has nulled request.user_id,
-- which the worker must cause as its final destructive step.

create or replace function public.renew_account_deletion_request(
  p_request_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_lease_seconds integer := greatest(30, least(coalesce(p_lease_seconds, 300), 900));
begin
  if p_request_id is null or p_lease_token is null then
    return false;
  end if;

  update public.account_deletion_requests
     set lease_expires_at = now() + make_interval(secs => v_lease_seconds),
         updated_at = now()
   where id = p_request_id
     and status = 'processing'
     and user_id is not null
     and lease_token = p_lease_token
     and lease_expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.complete_account_deletion_request(
  p_request_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_request_id is null or p_lease_token is null then
    return false;
  end if;

  -- The Auth user must already have been deleted. The request's FK is
  -- ON DELETE SET NULL, so this is a strong ordering check.
  update public.account_deletion_requests
     set status = 'completed',
         completed_at = now(),
         lease_token = null,
         lease_expires_at = null,
         last_error_code = null,
         updated_at = now()
   where id = p_request_id
     and status = 'processing'
     and user_id is null
     and lease_token = p_lease_token;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.recover_completed_account_deletion_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  -- A worker may crash after Auth deletion but before marking the queue row
  -- complete. Since user_id is nulled only by Auth deletion, these requests
  -- can be safely finalized on the next worker tick.
  update public.account_deletion_requests
     set status = 'completed',
         completed_at = coalesce(completed_at, now()),
         lease_token = null,
         lease_expires_at = null,
         last_error_code = null,
         updated_at = now()
   where status = 'processing'
     and user_id is null
     and completed_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.renew_account_deletion_request(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_account_deletion_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.recover_completed_account_deletion_requests() from public, anon, authenticated;
grant execute on function public.renew_account_deletion_request(uuid, uuid, integer) to service_role;
grant execute on function public.complete_account_deletion_request(uuid, uuid) to service_role;
grant execute on function public.recover_completed_account_deletion_requests() to service_role;

comment on function public.renew_account_deletion_request(uuid, uuid, integer) is
  'Extends an unexpired matching account-deletion worker lease. Service role only.';
comment on function public.complete_account_deletion_request(uuid, uuid) is
  'Marks a request complete only after Auth deletion has nulled its user_id. Service role only.';
comment on function public.recover_completed_account_deletion_requests() is
  'Finalizes processing requests whose Auth user was already deleted before a worker crash. Service role only.';
