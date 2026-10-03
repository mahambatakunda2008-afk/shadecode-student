drop function if exists public.checkpoint_cortex_generation(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, integer, jsonb, jsonb);

-- Atomically persist a lesson section and advance its durable Cortex checkpoint.
create or replace function public.checkpoint_cortex_generation(
  p_job_id uuid,
  p_user_id uuid,
  p_lease_id uuid,
  p_status text,
  p_stage text,
  p_subject_id uuid,
  p_title text,
  p_topic text,
  p_description text,
  p_difficulty text,
  p_progress integer,
  p_completed_units integer,
  p_total_units integer,
  p_blocks jsonb,
  p_result jsonb default null
)
returns table(checkpointed boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if current_user <> 'service_role' then
    raise exception 'checkpoint_cortex_generation: service role required';
  end if;

  -- Claim validation is the gate. Because this function runs inside one
  -- transaction, every later write rolls back if the lease is invalid.
  update public.cortex_generation_jobs
  set status = p_status,
      stage = left(p_stage, 80),
      partial = case when p_status = 'complete' then null else jsonb_build_object(
        'title', left(p_title, 255),
        'blocks', p_blocks,
        'completedUnits', greatest(0, p_completed_units),
        'totalUnits', greatest(0, p_total_units)
      ) end,
      result = case when p_status = 'complete' then p_result else result end,
      progress = greatest(0, least(100, p_progress)),
      completed_units = greatest(0, p_completed_units),
      total_units = greatest(0, p_total_units),
      lease_id = case when p_status = 'complete' then null else lease_id end,
      lease_until = case when p_status = 'complete' then null else lease_until end,
      heartbeat_at = v_now,
      updated_at = v_now,
      error = case when p_status = 'complete' then null else error end
  where id = p_job_id
    and user_id = p_user_id
    and lease_id = p_lease_id
    and lease_until > v_now;

  if not found then
    return query select false;
    return;
  end if;

  insert into public.learn_lessons (
    id, user_id, subject_id, topic, title, description, difficulty, progress, blocks, updated_at
  ) values (
    p_job_id, p_user_id, p_subject_id, left(p_topic, 500), left(p_title, 255),
    left(p_description, 1500), p_difficulty, greatest(0, least(100, p_progress)), p_blocks, v_now
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    subject_id = excluded.subject_id,
    topic = excluded.topic,
    title = excluded.title,
    description = excluded.description,
    difficulty = excluded.difficulty,
    progress = excluded.progress,
    blocks = excluded.blocks,
    updated_at = excluded.updated_at;

  return query select true;
end;
$$;

revoke execute on function public.checkpoint_cortex_generation(uuid, uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, integer, jsonb, jsonb)
  from public, anon, authenticated, postgres;
grant execute on function public.checkpoint_cortex_generation(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, integer, jsonb, jsonb)
  to service_role;
