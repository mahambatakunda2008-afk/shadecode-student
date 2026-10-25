# Challenge-table authorization remediation

**Status:** Proposed migration and server-route changes are in draft PR #481. Nothing has been applied to production. The fix is not considered validated until it passes CI and role-based tests against an isolated database.

## Production evidence (read-only, 2026-10-25)

Effective table privilege checks returned SELECT, INSERT, UPDATE, DELETE and TRUNCATE = true for both `anon` and `authenticated` on `ai_anomalies`, `challenge_attempts`, `challenge_answer_keys` and `challenges`. The policy catalogue also showed an unconditional authenticated ALL policy on `ai_anomalies`, and public SELECT on raw challenge attempts. Supabase Advisors reported `challenge_answer_keys` has RLS enabled but no policies. This is a confirmed configuration risk, not evidence of exploitation. RLS does not protect against TRUNCATE.

## Proposed changes in PR #481

Migration: `supabase/migrations/20261025170000_harden_challenge_table_grants.sql`

- Revoke all direct browser-role table privileges on `ai_anomalies`, `challenge_answer_keys`, and `challenge_attempts`; grant the required privileges to `service_role`.
- Remove the unconditional authenticated `ai_anomalies` policy and public raw-attempt read/insert policies.
- Revoke all browser-role privileges on `challenges`, then grant column-level SELECT only for the approved public preview and API projection. Do not expose `result_id` through browser table reads.
- Allow authenticated INSERT only when `challenger_id = auth.uid()`; retain public SELECT RLS for shareable challenge links.

Server routes in the PR:
- `src/app/api/challenge/attempt/route.ts` now writes self-reported legacy attempts through the admin client, records `verified=false`, and returns a retryable error if persistence fails. It still does not turn client-supplied scores into verified scores.
- `src/app/api/challenge/mark/route.ts` writes server-marked attempts through the admin client and returns a retryable error if persistence fails.
- `src/app/api/challenge/route.ts` uses server-side access for duplicate detection because `result_id` is no longer exposed to browser roles, and returns only an explicit approved field list.
- `src/app/challenge/[id]/page.tsx` selects only the columns needed for the public challenge preview.

## Required validation before merge or production

1. Run CI (typecheck, lint, unit tests and production build) against the final PR head.
2. Apply the migration only to an isolated development database first. The currently connected secondary Supabase project is inactive; no paid branch/project was created.
3. Verify with real anonymous, learner A, learner B and service-role API requests. Confirm anon/learners cannot select or mutate answer keys, AI anomaly rows, or raw attempts; cannot TRUNCATE any target table; and cannot read private linkage columns such as `result_id`.
4. Verify owned challenge creation, duplicate detection, anonymous preview, authenticated challenge retrieval, legacy attempt submission, deterministic server marking and self-practice still work.
5. Verify failed persistence is shown as failure, legacy attempts remain visibly unverified, and learner A cannot access learner B's attempts.
6. Recheck effective grants, RLS policies, inherited grants, role memberships and default privileges after applying the migration in development.
7. Inspect all other repository consumers before changing the target policy further. Do not treat an administrative privilege query as a substitute for real Data API requests.

## Separate follow-ups

Supabase Advisors flagged `apply_lesson_vote()` and `publish_lesson_to_library()` as SECURITY DEFINER trigger functions executable by browser roles. Their definitions return `trigger`, so they are intended as trigger handlers, not ordinary RPCs. Review execute grants separately and test trigger behavior before changing them. Leaked-password protection is disabled in Auth settings and requires a separate dashboard configuration change.

## Safety boundary

No production grants, policies, migrations or learner data were changed. Do not merge or apply the migration to production until isolated role-based tests pass and a rollback plan is ready.
