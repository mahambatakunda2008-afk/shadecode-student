-- Keep server-marked challenge submissions private and retry-safe.
-- The RPC is the single atomic boundary for storing a result and its battle row.

create table if not exists public.challenge_mark_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint challenge_mark_submissions_once unique (challenge_id, user_id, submission_id)
);

alter table public.challenge_mark_submissions enable row level security;
revoke all on table public.challenge_mark_submissions from anon, authenticated;
grant all on table public.challenge_mark_submissions to service_role;

create or replace function public.record_challenge_mark_submission(
  p_challenge_id uuid,
  p_user_id uuid,
  p_submission_id uuid,
  p_result jsonb,
  p_attempt jsonb default null,
  p_signals jsonb default '[]'::jsonb
)
returns table(inserted boolean, result jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if jsonb_typeof(coalesce(p_signals, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_signals, '[]'::jsonb)) > 50 then
    raise exception 'Invalid challenge learning signals';
  end if;
  insert into public.challenge_mark_submissions as saved (
    challenge_id, user_id, submission_id, result
  )
  values (p_challenge_id, p_user_id, p_submission_id, p_result)
  on conflict (challenge_id, user_id, submission_id) do nothing
  returning saved.result into v_result;

  if found then
    if p_attempt is not null then
      insert into public.challenge_attempts (
        challenge_id, user_id, user_name, percentage, total_score,
        max_score, time_taken, grade, won, verified
      ) values (
        p_challenge_id,
        p_user_id,
        p_attempt->>'userName',
        (p_attempt->>'percentage')::integer,
        (p_attempt->>'totalScore')::integer,
        (p_attempt->>'maxScore')::integer,
        (p_attempt->>'timeTaken')::integer,
        p_attempt->>'grade',
        coalesce((p_attempt->>'won')::boolean, false),
        coalesce((p_attempt->>'verified')::boolean, true)
      );
    end if;

    -- Store the derived learning evidence in the same transaction as the result.
    insert into public.learning_signals (
      user_id, kind, source, item_key, syllabus_id, topic_key, correct,
      score, mistake_id, time_spent_seconds, props
    )
    select
      p_user_id,
      signal.kind,
      signal.source,
      signal.item_key,
      signal.syllabus_id,
      signal.topic_key,
      signal.correct,
      signal.score,
      signal.mistake_id,
      signal.time_spent_seconds,
      coalesce(signal.props, '{}'::jsonb)
    from jsonb_to_recordset(coalesce(p_signals, '[]'::jsonb)) as signal(
      kind text, source text, item_key text, syllabus_id text, topic_key text,
      correct boolean, score numeric, mistake_id text, time_spent_seconds integer, props jsonb
    );

    return query select true, p_result;
    return;
  end if;

  select saved.result into v_result
  from public.challenge_mark_submissions as saved
  where saved.challenge_id = p_challenge_id
    and saved.user_id = p_user_id
    and saved.submission_id = p_submission_id;

  if v_result is null then
    raise exception 'Challenge submission result could not be recovered';
  end if;

  return query select false, v_result;
end;
$$;

revoke all on function public.record_challenge_mark_submission(uuid, uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_challenge_mark_submission(uuid, uuid, uuid, jsonb, jsonb, jsonb) to service_role;
