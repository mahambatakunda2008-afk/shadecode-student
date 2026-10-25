-- Least-privilege boundary for challenge data.
-- Browser roles must never access private answer keys, raw attempt rows, or AI anomaly records.
-- Challenge writes are server-owned so clients cannot forge the displayed challenger score.

begin;

revoke all privileges on table public.ai_anomalies from public, anon, authenticated;
revoke all privileges on table public.challenge_answer_keys from public, anon, authenticated;
revoke all privileges on table public.challenge_attempts from public, anon, authenticated;

grant all privileges on table public.ai_anomalies to service_role;
grant all privileges on table public.challenge_answer_keys to service_role;
grant all privileges on table public.challenge_attempts to service_role;

drop policy if exists "Admins can manage ai_anomalies" on public.ai_anomalies;
drop policy if exists "Service role full access ai_anomalies" on public.ai_anomalies;
drop policy if exists "Public read attempts" on public.challenge_attempts;
drop policy if exists "Auth users insert attempts" on public.challenge_attempts;

-- Challenges are shareable, but browser roles can read only the reviewed projection.
-- All challenge creation and mutations must pass through authenticated server routes.
revoke all privileges on table public.challenges from public, anon, authenticated;
grant select (id, challenger_id, challenger_name, subject, topic, difficulty, question_count,
              percentage, total_score, max_score, time_taken, grade, created_at)
  on table public.challenges to anon, authenticated;

drop policy if exists "Auth users create challenges" on public.challenges;
drop policy if exists "Public read challenges" on public.challenges;

create policy "Public read challenge preview"
  on public.challenges
  for select
  to anon, authenticated
  using (true);

commit;
