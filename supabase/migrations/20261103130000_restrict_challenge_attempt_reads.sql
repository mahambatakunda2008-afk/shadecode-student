-- challenge_attempts exposed user_id and every battle result to anyone. Nothing in the app reads it
-- directly (all writes and reads go through server routes), so restrict reads to the learner who
-- made the attempt and the challenger who owns the challenge. Applied live 2026-11-03; verified
-- anon = 0 rows, unrelated user = 0 rows, challenger = 1 row.
drop policy if exists "Public read attempts" on public.challenge_attempts;
create policy "Learner or challenger reads attempts" on public.challenge_attempts
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_attempts.challenge_id and c.challenger_id = (select auth.uid())
    )
  );
