# Challenge-table authorization remediation plan

**Status:** Proposed only. No SQL has been applied to the connected production database.
**Observed:** Live metadata inspection on 2026-10-23 showed broad direct table grants to `anon` and `authenticated` on four tables, including `TRUNCATE`; an authenticated `ALL` policy on `ai_anomalies` with unconditional predicates; and a public row-read policy on `challenge_attempts`.

## Required target state

| Table | Anonymous browser role | Authenticated learner | Server-side service role |
|---|---|---|---|
| `ai_anomalies` | No direct access | No direct access | Required server operations only |
| `challenge_answer_keys` | No direct access | No direct access | Read/write for server marking only |
| `challenge_attempts` | No raw row access | Insert own attempt; read own rows only | Required server operations only |
| `challenges` | Read only fields needed by public challenge previews | Read public challenge; create owned challenges | Required server operations only |

No browser role should have `TRUNCATE`, `REFERENCES`, or `TRIGGER` privileges on these tables. The application must not depend on direct client-side writes to internal AI anomaly or answer-key tables.

## Important implementation caveats

- `challenge_attempts` is currently publicly readable under RLS and includes learner identity/performance fields. Removing raw public reads may affect a leaderboard or other UI. Search and verify all consumers before applying a policy change. If public rankings are required, create a separately reviewed sanitized view/RPC that exposes only intended display data and aggregate results.
- Shared challenge URLs currently read challenge records for score-card previews. Preserve this workflow without exposing unrelated columns or private linkage identifiers. The current page selects `*` server-side; review whether a public projection is more appropriate.
- The challenge creation API uses the authenticated server client to insert a challenge and reads the result owned by the current user. Keep the owner check enforced in RLS, not just in route code.
- The attempt submission route requires sign-in and writes the authenticated user's ID. Its insert policy should reject null and forged `user_id` values.
- The server marking route writes `challenge_answer_keys` using a service-role client. Never move the service-role key into a browser bundle.
- A privilege check run through an administrative SQL connection is not the same as a real request using anon/authenticated API keys. Confirm effective grants and RLS with disposable test identities before and after the migration.
- Table privileges may also be inherited through grants, default privileges, or role membership. Verify all three; do not rely only on a policy listing.

## Required pre-merge checks

1. Trace all code references to the four tables and document expected reads/writes.
2. In a development Supabase project, test with anonymous, learner A, learner B, and server-side identities.
3. Assert that anonymous and ordinary learners cannot read or mutate AI anomaly rows or answer keys.
4. Assert learner A cannot read learner B's attempts; null/forged user IDs are rejected; public raw attempt reads are denied.
5. Verify challenge creation, public challenge preview, challenge acceptance, attempt submission, server marking, and retry behavior still work.
6. Verify no browser role can truncate the tables or execute unneeded update/delete operations.
7. Apply a reviewed migration in development, run the authenticated learner flow, and re-run the privilege/policy snapshot.
8. Only after all checks pass should the migration be considered for production. Keep a rollback plan and preserve challenge history.

## Scope

This is a remediation specification, not proof that the issue is fixed. No production grants, policies, or learner data were changed. Do not claim full data isolation until the role-based tests above pass.
