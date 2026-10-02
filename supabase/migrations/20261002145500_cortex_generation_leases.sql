-- Harden Cortex lesson generation with an expiring server-side lease.
-- The live project may already contain these columns/function from iterative rollout.
alter table public.cortex_generation_jobs
  add column if not exists lease_id uuid,
  add column if not exists lease_until timestamptz;

create index if not exists cortex_generation_jobs_lease_idx
  on public.cortex_generation_jobs (status, lease_until);

create or replace function public.claim_cortex_generation_job(
  p_job_id uuid,
  p_user_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer default 90
)
returns table(claimed boolean, lease_until timestamptz, current_lease_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_until timestamptz := v_now + make_interval(secs => greatest(30, least(p_lease_seconds, 180)));
begin
  if current_user <> 'service_role' then
    raise exception 'claim_cortex_generation_job: service role required';
  end if;

  return query
  update public.cortex_generation_jobs j
  set lease_id = p_lease_id,
      lease_until = v_until,
      heartbeat_at = v_now,
      updated_at = v_now
  where j.id = p_job_id
    and j.user_id = p_user_id
    and (j.lease_id is null or j.lease_until <= v_now or j.lease_id = p_lease_id)
  returning true, j.lease_until, j.lease_id;

  if not found then
    return query
    select false, j.lease_until, j.lease_id
    from public.cortex_generation_jobs j
    where j.id = p_job_id
      and j.user_id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.claim_cortex_generation_job(uuid, uuid, uuid, integer)
  from public, anon, authenticated, postgres;
grant execute on function public.claim_cortex_generation_job(uuid, uuid, uuid, integer)
  to service_role;
