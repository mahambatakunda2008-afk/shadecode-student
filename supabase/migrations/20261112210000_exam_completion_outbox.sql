create table if not exists public.exam_completion_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','completed')),
  claim_token uuid not null default gen_random_uuid(),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint exam_completion_outbox_user_attempt_key unique(user_id,attempt_id)
);

create index if not exists exam_completion_outbox_pending_idx
  on public.exam_completion_outbox(next_attempt_at,created_at)
  where status <> 'completed';

alter table public.exam_completion_outbox enable row level security;
revoke all on public.exam_completion_outbox from public, anon, authenticated;
grant all on public.exam_completion_outbox to service_role;

create or replace function public.complete_exam_submission(
  p_user_id uuid,
  p_attempt_id text,
  p_payload_hash text,
  p_claim_token uuid,
  p_result jsonb,
  p_event jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_result is null or p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Exam result and completion event are required';
  end if;

  update public.exam_submission_ledger
  set status = 'completed',
      result = p_result,
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where user_id = p_user_id
    and attempt_id = trim(p_attempt_id)
    and payload_hash = p_payload_hash
    and lease_token = p_claim_token
    and status = 'processing';

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    return false;
  end if;

  insert into public.exam_completion_outbox(user_id,attempt_id,payload)
  values (p_user_id,trim(p_attempt_id),p_event)
  on conflict (user_id,attempt_id) do nothing;

  return true;
end;
$$;

create or replace function public.claim_exam_completion_outbox(p_limit integer default 10)
returns table(id uuid,user_id uuid,attempt_id text,payload jsonb,claim_token uuid,attempts integer)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.exam_completion_outbox o
    where (o.status = 'pending' and o.next_attempt_at <= now())
       or (o.status = 'processing' and o.updated_at < now() - interval '3 minutes')
    order by o.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,10),50))
  ), claimed as (
    update public.exam_completion_outbox o
    set status='processing',
        claim_token=gen_random_uuid(),
        attempts=o.attempts+1,
        updated_at=now()
    from candidates c
    where o.id=c.id
    returning o.id,o.user_id,o.attempt_id,o.payload,o.claim_token,o.attempts
  )
  select * from claimed;
end;
$$;

create or replace function public.finish_exam_completion_outbox(
  p_id uuid,
  p_claim_token uuid,
  p_error text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.exam_completion_outbox
  set status=case when p_error is null then 'completed' else 'pending' end,
      completed_at=case when p_error is null then now() else null end,
      last_error=case when p_error is null then null else left(p_error,1000) end,
      next_attempt_at=case when p_error is null then next_attempt_at
        else now() + make_interval(secs => least(3600, power(2,least(attempts,10))::integer * 15)) end,
      updated_at=now()
  where id=p_id and claim_token=p_claim_token and status='processing';

  get diagnostics updated_count = row_count;
  return updated_count=1;
end;
$$;

revoke all on function public.complete_exam_submission(uuid,text,text,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.claim_exam_completion_outbox(integer) from public,anon,authenticated;
revoke all on function public.finish_exam_completion_outbox(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_exam_submission(uuid,text,text,uuid,jsonb,jsonb) to service_role;
grant execute on function public.claim_exam_completion_outbox(integer) to service_role;
grant execute on function public.finish_exam_completion_outbox(uuid,uuid,text) to service_role;
