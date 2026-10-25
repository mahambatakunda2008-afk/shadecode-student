-- Least-privilege boundary for challenge data.
-- Browser roles must never access private answer keys, raw attempt rows, or AI anomaly records.
-- All mutations to those tables go through authenticated server routes using service_role.
-- This migration preserves a column-limited public challenge preview and authenticated owned creation.

begin;

-- Private/internal tables: remove direct Data API access from every browser role.
revoke all privileges on table public.ai_anomalies from public, anon, authenticated;
revoke all privileges on table public.challenge_answer_keys from public, anon, authenticated;
revoke all privileges on table public.challenge_attempts from public, anon, authenticated;

grant all privileges on table public.ai_anomalies to service_role;
grant all privileges on table public.challenge_answer_keys to service_role;
grant all privileges on table public.challenge_attempts to service_role;

-- RLS is defense in depth. No browser policies are needed for server-only tables.
drop policy if exists "Admins can manage ai_anomalies" on public.ai_anomalies;
drop policy if exists "Service role full access ai_anomalies" on public.ai_anomalies;
drop policy if exists "Public read attempts" on public.challenge_attempts;
drop policy if exists "Auth users insert attempts" on public.challenge_attempts;

-- Challenges are shareable, but browser roles may read only the reviewed preview/API projection.
revoke all privileges on table public.challenges from public, anon, authenticated;
grant select (id, challenger_id, challenger_name, subject, topic, difficulty, question_count,
              percentage, total_score, max_score, time_taken, grade, created_at)
  on table public.challenges to anon, authenticated;
grant insert on table public.challenges to authenticated;

drop policy if exists "Auth users create challenges" on public.challenges;
drop policy if exists "Public read challenges" on public.challenges;

create policy "Public read challenge preview"
  on public.challenges
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users create owned challenges"
  on public.challenges
  for insert
  to authenticated
  with check (auth.uid() = challenger_id and challenger_id is not null);

commit;
