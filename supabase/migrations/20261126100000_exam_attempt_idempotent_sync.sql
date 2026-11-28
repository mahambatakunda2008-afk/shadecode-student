-- Durable, account-scoped Exam Sim relay.
-- Local IndexedDB remains the source of truth; this table is the idempotent cloud copy.
create table if not exists public.exam_attempt_sync (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null,
  client_revision bigint not null check (client_revision > 0),
  device_id text not null check (char_length(device_id) between 1 and 200),
  status text not null check (status in ('active', 'submitted')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, attempt_id)
);

alter table public.exam_attempt_sync enable row level security;
revoke all on public.exam_attempt_sync from anon, public;
grant select, insert, update on public.exam_attempt_sync to authenticated;

drop policy if exists "Learners read own exam attempt sync" on public.exam_attempt_sync;
create policy "Learners read own exam attempt sync"
  on public.exam_attempt_sync for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Learners insert own exam attempt sync" on public.exam_attempt_sync;
create policy "Learners insert own exam attempt sync"
  on public.exam_attempt_sync for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners update own exam attempt sync" on public.exam_attempt_sync;
create policy "Learners update own exam attempt sync"
  on public.exam_attempt_sync for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.sync_exam_attempt(
  p_attempt_id text,
  p_client_revision bigint,
  p_device_id text,
  p_status text,
  p_payload jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved public.exam_attempt_sync%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_attempt_id is null or char_length(p_attempt_id) not between 1 and 200
     or p_client_revision is null or p_client_revision < 1
     or p_device_id is null or char_length(p_device_id) not between 1 and 200
     or p_status not in ('active', 'submitted')
     or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid exam attempt sync payload' using errcode = '22023';
  end if;

  insert into public.exam_attempt_sync (
    user_id, attempt_id, client_revision, device_id, status, payload, updated_at
  ) values (
    v_user_id, p_attempt_id, p_client_revision, p_device_id, p_status, p_payload, now()
  )
  on conflict (user_id, attempt_id) do update set
    client_revision = excluded.client_revision,
    device_id = excluded.device_id,
    status = excluded.status,
    payload = excluded.payload,
    updated_at = now()
  where public.exam_attempt_sync.client_revision < excluded.client_revision
    and (public.exam_attempt_sync.status <> 'submitted' or excluded.status = 'submitted')
  returning * into v_saved;

  if found then
    return jsonb_build_object('status', 'accepted', 'revision', v_saved.client_revision);
  end if;

  select * into v_saved
  from public.exam_attempt_sync
  where user_id = v_user_id and attempt_id = p_attempt_id;

  if v_saved.client_revision = p_client_revision
     and v_saved.payload = p_payload
     and v_saved.status = p_status then
    return jsonb_build_object('status', 'already-applied', 'revision', v_saved.client_revision);
  end if;

  return jsonb_build_object('status', 'conflict', 'revision', v_saved.client_revision, 'deviceId', v_saved.device_id, 'savedStatus', v_saved.status, 'savedPayload', v_saved.payload, 'updatedAt', v_saved.updated_at);
end;
$$;

revoke all on function public.sync_exam_attempt(text, bigint, text, text, jsonb) from public, anon;
grant execute on function public.sync_exam_attempt(text, bigint, text, text, jsonb) to authenticated;


-- Fetch only the authenticated user's cloud copies for recovery on another device.
create or replace function public.get_my_exam_attempts()
returns setof public.exam_attempt_sync
language sql
security invoker
set search_path = public, auth
as $$
  select * from public.exam_attempt_sync
  where user_id = auth.uid()
  order by updated_at desc
  limit 100;
$$;
revoke all on function public.get_my_exam_attempts() from public, anon;
grant execute on function public.get_my_exam_attempts() to authenticated;
