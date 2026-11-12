create table if not exists public.exam_submission_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null,
  payload_hash text not null,
  status text not null default 'processing' check (status in ('processing', 'completed')),
  lease_token uuid not null default gen_random_uuid(),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint exam_submission_ledger_user_attempt_key unique (user_id, attempt_id),
  constraint exam_submission_ledger_result_state check (
    (status = 'processing' and result is null and completed_at is null)
    or (status = 'completed' and result is not null and completed_at is not null)
  )
);

create index if not exists exam_submission_ledger_user_created_idx
  on public.exam_submission_ledger(user_id, created_at desc);

alter table public.exam_submission_ledger enable row level security;

drop policy if exists "students read their exam submission ledger" on public.exam_submission_ledger;
create policy "students read their exam submission ledger"
  on public.exam_submission_ledger for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.claim_exam_submission(
  p_user_id uuid,
  p_attempt_id text,
  p_payload_hash text
)
returns table(state text, saved_result jsonb, claim_token uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
  existing public.exam_submission_ledger%rowtype;
  new_token uuid;
begin
  if p_user_id is null or p_attempt_id is null or length(trim(p_attempt_id)) = 0
     or p_payload_hash is null or length(p_payload_hash) <> 64 then
    raise exception 'Invalid exam submission identity';
  end if;

  insert into public.exam_submission_ledger(user_id, attempt_id, payload_hash)
  values (p_user_id, trim(p_attempt_id), p_payload_hash)
  on conflict (user_id, attempt_id) do nothing
  returning lease_token into new_token;

  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then
    return query select 'claimed'::text, null::jsonb, new_token;
    return;
  end if;

  select * into existing
  from public.exam_submission_ledger
  where user_id = p_user_id and attempt_id = trim(p_attempt_id)
  for update;

  if existing.payload_hash <> p_payload_hash then
    return query select 'payload_conflict'::text, null::jsonb, null::uuid;
  elsif existing.status = 'completed' then
    return query select 'completed'::text, existing.result, null::uuid;
  elsif existing.updated_at < now() - interval '3 minutes' then
    update public.exam_submission_ledger
    set lease_token = gen_random_uuid(), updated_at = now()
    where id = existing.id
    returning lease_token into new_token;
    return query select 'claimed'::text, null::jsonb, new_token;
  else
    return query select 'processing'::text, null::jsonb, null::uuid;
  end if;
end;
$$;

create or replace function public.complete_exam_submission(
  p_user_id uuid,
  p_attempt_id text,
  p_payload_hash text,
  p_claim_token uuid,
  p_result jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_result is null then
    raise exception 'Exam result is required';
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
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_exam_submission(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_exam_submission(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_exam_submission(uuid, text, text) to service_role;
grant execute on function public.complete_exam_submission(uuid, text, text, uuid, jsonb) to service_role;

grant select on public.exam_submission_ledger to authenticated;
grant all on public.exam_submission_ledger to service_role;


-- Stable identity for visible exam results. Historical rows retain NULL identities.
do $$ begin
  if to_regclass('public.exam_results') is not null then
    alter table public.exam_results add column if not exists attempt_id text;
    create unique index if not exists exam_results_user_attempt_id_key on public.exam_results(user_id, attempt_id);
  end if;
end $$;
