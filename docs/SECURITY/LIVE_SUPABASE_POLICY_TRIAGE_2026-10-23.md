# Live Supabase policy review: triage findings

**Reviewed:** 2026-10-23 (read-only metadata inspection)  
**Project:** `zczdtffwzkctkxwmvalb`  
**Status:** Findings recorded; no production policy or data changes made. This is not a complete penetration test or proof of exploitability.

## Executive summary

The live policy metadata shows at least two high-priority policy defects to investigate and remediate before treating learner data as safely isolated:

1. `public.ai_anomalies` has a policy named `Admins can manage ai_anomalies` for the `authenticated` role with both `USING (true)` and `WITH CHECK (true)`. As written, this policy does not check whether the caller is an admin. Because it is an `ALL` policy, an authenticated client may be able to read, insert, update, or delete rows through the Data API, subject to the table grants and other applicable policies. Confirm grants and test with a non-admin account in a controlled environment.
2. `public.challenge_attempts` has a `SELECT` policy for `public` with `USING (true)`. The table contains `user_name`, `user_id`, percentage, score, maximum score, time taken, grade, win status and timestamp. This permits broad row visibility to roles covered by the policy and can expose learner identity/performance data. Confirm the product's intended public leaderboard behavior and replace broad row access with a minimal public projection or a properly scoped policy.

These are policy configuration risks. This inspection did not query or export learner row contents and does not establish that anyone exploited the policies.

## Additional items to review

| Table | Observed policy pattern | Why it needs review |
|---|---|---|
| `challenges` | Public `SELECT USING (true)`; insert accepts matching `challenger_id` **or NULL** | Public challenge metadata may be intentional, but nullable ownership needs a documented anonymous-flow design and input validation. |
| `exam_results` | Insert check accepts `auth.uid() = user_id OR user_id IS NULL`; `user_id` nullable | Determine whether anonymous results are intended, where they are stored, and ensure private result rows are not publicly readable. |
| `experiment_assignments` | Authenticated insert accepts own user ID or NULL | Check whether a client can create anonymous assignments that should be server-controlled, and validate experiment membership/variant. |
| `export_logs` | Authenticated insert accepts own user ID or NULL | Export audit records should not be forgeable in a way that undermines incident review; prefer server-derived identity and server-side writes. |
| `survey_responses` | Authenticated insert accepts own user ID or NULL; includes JSON answers and nullable anonymous ID | Verify intended anonymous survey behavior, collection minimization, and whether read policies prevent cross-user access. |
| `traction_events` | Authenticated insert accepts own user ID or NULL; includes JSON properties and anonymous/session identifiers | Ensure telemetry is minimized, bounded, and not treated as trusted server-side evidence. |
| `feedback` | Public insert allows NULL user ID or matching auth UID | May be intentional for anonymous feedback; rate limiting and retention should be verified. |
| `challenge_answer_keys` | RLS enabled, no policies returned in metadata | Likely inaccessible to anon/authenticated through normal RLS, but confirm expected server/service-role access and app functionality. |
| `feedback_rate_limits` | RLS enabled, no policies returned in metadata | Confirm the server can update/read it as intended and client roles cannot bypass rate limits. |

The metadata query is a triage aid, not a formal proof that all tables are secure or insecure. A table having RLS enabled, or having any policy, does not by itself prove correct ownership isolation.

## Immediate remediation plan

### P0: `ai_anomalies`
- Inspect migrations, intended admin-role helper and all call sites before changing policy semantics.
- Replace the current `authenticated USING (true) WITH CHECK (true)` management policy with a verified admin-only predicate (or remove client-side management entirely and allow only service-role server operations).
- Confirm the service role remains server-only; never expose its key in client bundles.
- Add migration-level policy tests and a negative test using an authenticated non-admin identity for SELECT, INSERT, UPDATE and DELETE.
- Test the intended admin identity positively.

### P0: `challenge_attempts`
- Decide whether public users need a leaderboard. If yes, expose only the minimum fields needed for ranking through a controlled view/RPC with safe aggregation or a sanitized public display name; do not expose raw learner rows by default.
- Remove unrestricted public row selection if not required. If private rows must remain, scope access to the row owner and authorized challenge participants.
- Check related `challenges` and `challenge_questions` policies, answer-key access, and server-side score verification together.
- Add anon, learner-A, learner-B and admin tests that assert which columns/rows each role can see.

### P1: nullable-owner insert policies
- For each table above, trace every client and server write path.
- Preserve anonymous inserts only where the feature genuinely supports them. Prefer a distinct anonymous/session identifier and server-side validation rather than accepting NULL as a blanket escape hatch.
- Keep audit logs server-generated and bind authenticated identity from the session, never from request JSON.
- Add tests for missing, null, forged, and other-user identifiers.

## Verification checklist

- [ ] Inspect the original migrations and current table grants.
- [ ] Reconcile migration-defined policies against the live metadata snapshot.
- [ ] Reproduce the two P0 findings in a disposable/test environment with anon, authenticated non-admin, owner, other learner and admin identities.
- [ ] Add regression tests for both allowed and denied operations.
- [ ] Deploy policy changes only after review and passing tests.
- [ ] Re-run the same read-only metadata query after deployment and retain the result.
- [ ] Run the learner export/deletion inventory only after ownership and related-data boundaries are understood.

## Scope and safety notes

- This inspection used schema, RLS policy, foreign-key metadata and storage bucket metadata. It did not dump learner content.
- Three private storage buckets were observed: `community-uploads-pending`, `past-papers`, and `shadecode-backups`. Bucket privacy alone does not prove object-level policies are correct; storage.objects policies and actual object paths still need review.
- Foreign-key delete rules include a mixture of CASCADE, SET NULL, RESTRICT and NO ACTION. Account deletion must not be implemented as a generic recursive delete until the full dependency graph and external/local stores have been reviewed.
- Do not claim data export, account deletion, or complete isolation is verified until authenticated end-to-end tests pass.
