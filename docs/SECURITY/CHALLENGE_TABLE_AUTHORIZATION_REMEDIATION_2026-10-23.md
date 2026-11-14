# Challenge-table authorization remediation plan

**Status:** Proposed only. No SQL has been applied to the connected production database.
**Observed:** Live metadata inspection on 2026-10-23 and re-verification on 2026-10-24 showed broad direct table grants to `anon` and `authenticated` on `ai_anomalies`, `challenge_attempts`, `challenge_answer_keys`, and `challenges`, including `TRUNCATE`; an authenticated `ALL` policy on `ai_anomalies` with unconditional predicates; and a public row-read policy on `challenge_attempts`.

## Required target state

| Table | Anonymous browser role | Authenticated learner | Server-side service role |
|---|---|---|---|
| `ai_anomalies` | No direct access | No direct access | Required server operations only |
| `challenge_answer_keys` | No direct access | No direct access | Read/write for server marking only |
| `challenge_attempts` | No raw row access | Insert own attempt; read own rows only | Required server operations only |
| `challenges` | Read only fields needed by public challenge previews | Read public challenge; create owned challenges | Required server operations only |

No browser role should have `TRUNCATE`, `REFERENCES`, or `TRIGGER` privileges on these tables. The application must not depend on direct client-side writes to internal AI anomaly or answer-key tables.

## Code-path trace (main, reviewed 2026-10-24)

### `challenges`
- `src/app/api/challenge/route.ts` POST requires an authenticated user, reads the caller's `exam_results` row, resolves the learner's allowed subject, and inserts a challenge with `challenger_id = user.id`. It freezes the question set into `challenge_questions`; deterministic answer keys are written through the service-role admin client.
- The same route's GET requires sign-in, selects `*` from `challenges`, then checks the subject against the caller's enrolled subjects. Prefer an explicit column list to reduce accidental field exposure.
- `src/app/challenge/[id]/page.tsx` uses the session client and selects `*` to render the public challenge preview and metadata. This route is intentionally shareable without sign-in. Its intended public projection is the score-card fields represented by the local `Challenge` interface, not arbitrary future columns.
- Therefore, removing public challenge reads outright will break shared links. Keep a narrow, reviewed public preview path and test it with a real anonymous request.

### `challenge_attempts`
- `src/app/api/challenge/attempt/route.ts` requires sign-in, reads the challenge's comparison percentage from the database, and inserts the authenticated user's ID. However, for legacy/client-marked challenges, the submitted percentage and scores still come from the request body. Treat these as **unverified/self-reported** results, not server-verified scores.
- That route logs insert errors but still returns `{ won }`; a failed insert can therefore look successful to the client. Fix the response semantics separately: return a failure/retryable response when persistence fails, and distinguish verified from self-reported results.
- `src/app/api/challenge/mark/route.ts` is the stronger path for deterministic frozen papers: it loads the answer key through the service-role client, computes the score on the server, and records `verified: true`. It skips recording the challenger's own practice run.
- `src/app/(app)/leaderboard/page.tsx` reads `profiles`, not `challenge_attempts`. Do not preserve public raw attempt access on the assumption that this page needs it. Search any other consumers before changing policy.

### `challenge_answer_keys`
- The only confirmed consumer in the traced routes is the server-side challenge creation route (insert via admin client) and marking route (select via admin client).
- Migration `20261009120000_battle_server_side_marking.sql` enables RLS and defines no browser policies, but that is not enough if direct table grants remain broad. Revoke unnecessary browser privileges as well as ensuring RLS denies browser access.
- Never expose the service-role key to browser code.

### `ai_anomalies`
- `src/app/api/admin/ai-anomalies/route.ts` checks the authenticated user's admin role before creating a service-role client. The inspected analysis route reads `ai_usage_logs`; no direct `ai_anomalies` consumer was confirmed in that route.
- The live policy named `Admins can manage ai_anomalies` grants `ALL` to `authenticated` with unconditional `USING (true)` and `WITH CHECK (true)`. The name does not make it admin-only. Remove browser access unless a concrete, tested user-facing use case is found.

## Re-verified live database findings (read-only, 2026-10-24)

- `pg_policies` confirms the unconditional `ai_anomalies` policy, public `SELECT` on raw `challenge_attempts`, and `INSERT` policies that permit `user_id IS NULL` on attempts and `challenger_id IS NULL` on challenges.
- Effective table privilege checks still report `anon` and `authenticated` have `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` on all four target tables. This is a privilege metadata result, not proof every operation is reachable through PostgREST; RLS can still block some row operations. `TRUNCATE` is not controlled by RLS.
- The Supabase security advisor also flags `apply_lesson_vote()` and `publish_lesson_to_library()` as SECURITY DEFINER trigger functions executable by `anon` and `authenticated`. Their inspected definitions return `trigger`, so they are intended as trigger handlers, not browser RPC endpoints. Review/revoke direct execute grants as a separate migration, and test lesson voting and library publishing triggers afterward. Do not confuse this separate finding with the challenge-table fix.
- The same advisor reports leaked-password protection disabled. This is an Auth configuration follow-up, not a table-policy migration.
- A fresh Supabase branch listing returned no development branches. Do not apply a permission migration to production as a substitute for missing development validation.

## Important implementation caveats

- A privilege check run through an administrative SQL connection is not the same as a real request using anon/authenticated API keys. Confirm effective grants and RLS with disposable test identities.
- Table privileges may be inherited through grants, default privileges, or role membership. Verify all three; do not rely only on a policy listing.
- Challenge preview metadata must remain shareable without leaking private linkage IDs, arbitrary future columns, raw attempt rows, or answer keys.
- Challenge subject checks must remain enforced on authenticated question retrieval and marking. Do not weaken these while changing table policies.
- Mixed verified and self-reported challenge attempts must be clearly distinguished anywhere results are displayed or used for ranking.

## Required pre-merge checks

1. Trace all table references across the repository, including generated types, components, server routes, tests, and SQL functions.
2. In a development Supabase project, test with anonymous, learner A, learner B, and server-side identities.
3. Assert anonymous and ordinary learners cannot read or mutate AI anomaly rows or answer keys.
4. Assert learner A cannot read learner B's attempts; null/forged user IDs are rejected; public raw attempt reads are denied.
5. Verify challenge creation, public challenge preview, challenge acceptance, attempt submission, server marking, self-practice, and retry behavior still work.
6. Verify no browser role can truncate the tables or execute unneeded update/delete operations.
7. Verify self-reported attempts cannot be presented as server-verified and a failed insert cannot be reported as a successful saved attempt.
8. Apply a reviewed migration in development, run the authenticated learner flow, and re-run the privilege/policy snapshot.
9. Review the trigger-function execute grants separately; verify lesson vote counters and lesson-library publishing still work.
10. Only after all checks pass should the migration be considered for production. Keep a rollback plan and preserve challenge history.

## Scope

This is a remediation specification, not proof that the issue is fixed. No production grants, policies, or learner data were changed. Do not claim full data isolation until the role-based tests above pass.
