# Live Supabase policy review: triage findings

**Reviewed:** 2026-10-23 (read-only metadata inspection)  
**Project:** `zczdtffwzkctkxwmvalb`  
**Status:** Findings recorded; no production policy or data changes made. This is not a complete penetration test or proof of exploitation.

## Executive summary

The live database metadata surfaced high-priority authorization risks. Verify these immediately and remediate through a reviewed migration after reproducing them safely in a development/test environment.

1. **P0 candidate: excessive table privileges on challenge/AI tables.** A read-only `has_table_privilege` check returned `SELECT`, `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` as true for the `anon`, `authenticated` and `service_role` roles on `ai_anomalies`, `challenge_attempts`, `challenge_answer_keys` and `challenges`. In particular, PostgreSQL `TRUNCATE` is not filtered by row-level security. Confirm the effective grants and inherited/public grants before acting, but treat this as urgent. The inspection did not execute any data-changing statement.
2. **P0 candidate: `public.ai_anomalies` admin policy does not check admin status.** The policy named `Admins can manage ai_anomalies` applies to `authenticated` with `USING (true)` and `WITH CHECK (true)`. Its condition is not an admin check. Combined with the observed table privileges, this is a serious authorization configuration candidate.
3. **P0 candidate: `public.challenge_attempts` exposes rows broadly.** It has a `SELECT` policy for `public` with `USING (true)`. The table contains `user_name`, `user_id`, percentage, score, maximum score, time taken, grade, win status and timestamp. This can expose learner identity/performance data. The observed broad grants also mean row-level policies should not be the only control.
4. **Answer-key protection needs verification.** `challenge_answer_keys` has RLS enabled and no policies returned in the snapshot, but the effective privilege check still returned broad table privileges including `TRUNCATE`. No claim is made that answer-key rows are readable through the Data API; confirm the effective RLS/grants behavior in a controlled test.

These are configuration risks, not evidence that anyone exploited them. This inspection did not query or export learner row contents.

## Additional policy items to review

| Table | Observed policy pattern | Why it needs review |
|---|---|---|
| `challenges` | Public `SELECT USING (true)`; insert accepts matching `challenger_id` **or NULL** | Public challenge metadata may be intentional, but nullable ownership needs a documented anonymous-flow design and input validation. |
| `exam_results` | Insert check accepts `auth.uid() = user_id OR user_id IS NULL`; `user_id` nullable | Determine whether anonymous results are intended and ensure private result rows are not publicly readable. |
| `experiment_assignments` | Authenticated insert accepts own user ID or NULL | Check whether clients can create assignments that should be server-controlled, and validate experiment membership/variant. |
| `export_logs` | Authenticated insert accepts own user ID or NULL | Export audit records should not be forgeable in a way that undermines incident review; prefer server-side writes. |
| `survey_responses` | Authenticated insert accepts own user ID or NULL; includes JSON answers and nullable anonymous ID | Verify intended anonymous survey behavior, minimization and cross-user read isolation. |
| `traction_events` | Authenticated insert accepts own user ID or NULL; includes JSON properties and anonymous/session identifiers | Ensure telemetry is minimized, bounded, and not treated as trusted server-side evidence. |
| `feedback` | Public insert allows NULL user ID or matching auth UID | May be intentional for anonymous feedback; verify rate limiting and retention. |
| `feedback_rate_limits` | RLS enabled, no policies returned in metadata | Confirm server-side access works as intended and client roles cannot bypass rate limits. |

The metadata query is a triage aid, not a complete security audit. RLS being enabled or a table having policies does not by itself prove correct isolation. Table grants, role membership, views, RPCs, triggers, service-role usage and storage policies all matter.

## Immediate remediation plan

### P0: verify and reduce effective table grants
- Inspect table grants, default privileges, PUBLIC grants, role memberships, ownership and migrations for the four tables above.
- In a development project, confirm effective privileges for `anon`, `authenticated`, and the intended server role.
- Revoke client-facing privileges that are not required, especially `TRUNCATE`, and grant only the minimum operations needed. Do not blindly revoke or alter production grants until server call sites and migration history are understood.
- Keep service-role credentials server-only.
- Add regression tests proving anon/authenticated roles cannot truncate or perform unauthorized writes, while intended server operations continue to work.

### P0: `ai_anomalies`
- Inspect migrations, the intended admin-role helper and all call sites.
- Replace the current `authenticated USING (true) WITH CHECK (true)` management policy with a verified admin-only predicate, or remove client-side management and allow only server-side service-role operations.
- Test non-admin denial for SELECT, INSERT, UPDATE and DELETE, and intended admin/server access positively.

### P0: `challenge_attempts` and answer keys
- Decide whether a public leaderboard is needed. If yes, expose only the minimum fields through a controlled view/RPC with safe aggregation or sanitized display names. Do not expose raw learner rows by default.
- Remove unrestricted row selection if not required, and reduce table grants.
- Keep answer keys unavailable to client roles; score and win outcomes must be calculated or verified server-side.
- Check related `challenges` and `challenge_questions` policies together.
- Add anon, learner-A, learner-B, admin and server-role tests for both allowed and denied row/column access.

### P1: nullable-owner insert policies
- Trace every client/server write path for the tables above.
- Preserve anonymous inserts only where the feature genuinely supports them. Prefer a distinct anonymous/session identifier and server-side validation rather than accepting NULL as a blanket escape hatch.
- Keep audit logs server-generated and bind authenticated identity from the session, never from request JSON.
- Add tests for missing, null, forged and other-user identifiers.

## Verification checklist

- [ ] Inspect original migrations, effective grants, default privileges, PUBLIC grants and role membership.
- [ ] Reconcile migration-defined policies against the live metadata snapshot.
- [ ] Reproduce P0 findings in a disposable/test environment with anon, authenticated non-admin, owner, other learner, admin and server identities.
- [ ] Add regression tests for both allowed and denied operations, including `TRUNCATE`.
- [ ] Deploy policy/grant changes only after review and passing tests.
- [ ] Re-run the same read-only metadata query after deployment and retain the result.
- [ ] Complete the learner export/deletion inventory only after ownership and related-data boundaries are understood.

## Scope and safety notes

- This inspection used schema, RLS policy, foreign-key metadata, effective table-privilege checks and storage bucket/policy metadata. It did not dump learner content and made no production changes.
- Three private storage buckets were observed: `community-uploads-pending`, `past-papers`, and `shadecode-backups`. The pending bucket has an authenticated upload policy and owner/admin read policy; the past-papers bucket has an authenticated read policy; the backup bucket policies scope paths to the authenticated user ID. These policy predicates still need controlled tests for path manipulation, role behavior and intended content access.
- Foreign-key delete rules include CASCADE, SET NULL, RESTRICT and NO ACTION. Account deletion must not be implemented as a generic recursive delete until the full dependency graph and external/local stores have been reviewed.
- Do not claim data export, account deletion, or complete isolation is verified until authenticated end-to-end tests pass.
