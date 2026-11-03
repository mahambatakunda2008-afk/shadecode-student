-- Battle attempts (won / verified) are written only by the server (service role).
-- Without this, any signed-in or anonymous client could insert a row with verified = true
-- straight through the REST API. Applied live 2026-11-03; forgery attempts by `authenticated`
-- and `anon` were confirmed rejected by RLS after applying.
drop policy if exists "Auth users insert attempts" on public.challenge_attempts;
