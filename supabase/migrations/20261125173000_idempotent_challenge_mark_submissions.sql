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
  p_attempt jsonb default null
)
returns table(inserted boolean, result jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
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

revoke all on function public.record_challenge_mark_submission(uuid, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_challenge_mark_submission(uuid, uuid, uuid, jsonb, jsonb) to service_role;
