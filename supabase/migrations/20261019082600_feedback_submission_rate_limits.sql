-- Feedback abuse control: shared, atomic rate limits across serverless instances.
-- Raw IP addresses are never stored; the application sends an HMAC-derived bucket key.
create table if not exists public.feedback_rate_limits (
  bucket_key text primary key check (length(bucket_key) between 1 and 200),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_rate_limits_updated_at_idx
  on public.feedback_rate_limits (updated_at);

alter table public.feedback_rate_limits enable row level security;
revoke all on table public.feedback_rate_limits from public, anon, authenticated;
grant all on table public.feedback_rate_limits to service_role;

create or replace function public.consume_feedback_rate_limit(
  p_bucket_key text,
  p_window_seconds integer default 900,
  p_max_requests integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) < 1 or length(p_bucket_key) > 200 then
    raise exception 'Invalid feedback rate-limit bucket';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 or p_max_requests < 1 or p_max_requests > 100 then
    raise exception 'Invalid feedback rate-limit configuration';
  end if;

  insert into public.feedback_rate_limits (bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, now(), 1, now())
  on conflict (bucket_key) do update
  set
    request_count = case
      when public.feedback_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.feedback_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.feedback_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.feedback_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count into v_count;

  -- Old buckets are safe to prune; this table contains no raw IP addresses.
  delete from public.feedback_rate_limits
  where updated_at < now() - interval '2 days'
    and bucket_key <> p_bucket_key;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_feedback_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_feedback_rate_limit(text, integer, integer) to service_role;
