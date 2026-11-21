# Release security remediation gates

**Prepared:** 2026-11-16  
**Baseline:** `main` at `c08e63949adfbc2f92bf8cd591621de0ce686967`  
**Scope:** Evidence-backed release blockers and the verification required before changing production access controls.  
**Status:** Planning document only. No production database changes were made.

## Current release blockers

### 1. Learner profile isolation

A read-only inspection of the live Supabase project found that `public.profiles` has RLS enabled, but the authenticated role has table-level read privileges and a public SELECT policy. The policy allows broad row visibility. This is a potential exposure of profile fields beyond the public leaderboard.

The application leaderboard reads from `leaderboard_profiles`, a narrow projection containing only `id`, `username`, `xp`, `season_xp`, `level` and `streak`. Its migration history includes a security-invoker hardening migration. This is a useful separation, but it does not by itself prove that the underlying `profiles` table is private.

**Required before release**
- Inventory every client and server read/write of `profiles`, including onboarding, settings, teacher/admin workflows, leaderboard and background jobs.
- Inspect effective grants, role memberships, view ownership and `security_invoker` behavior.
- In a disposable Supabase project, test anonymous, learner A, learner B, teacher, admin and service-role access.
- Prove that learner A cannot read learner B's private fields while the public leaderboard still returns only the intended six fields.
- Add regression tests for both allowed and denied access.
- Apply a reviewed migration only after the disposable-project tests pass.

Do not solve this by blindly revoking SELECT or changing the leaderboard view. Either could break legitimate application flows or accidentally widen access through a replacement view/RPC.

### 2. SECURITY DEFINER function execution

The 2026-11-15 22:23 UTC Security Advisor snapshot reports three SECURITY DEFINER functions executable by `anon` and nine executable by `authenticated`. The three anon-callable functions are `apply_lesson_vote()`, `guard_teacher_tutorial_transition()` and `publish_lesson_to_library()`. The authenticated-callable set additionally includes `claim_lesson_quiz_attempt(uuid, integer[])`, `complete_lesson_quiz_attempt(uuid)`, `has_role(uuid, text)`, `publish_teacher_tutorial(uuid, integer)`, `redeem_teacher_invite(text)` and `review_teacher_tutorial(uuid, integer, text, text)`.

**Required before release**
- Enumerate each function's signature, owner, grants, search path, body and call sites.
- Classify each as intentionally client-callable, server-only, or trigger-only.
- Revoke unnecessary client EXECUTE grants and explicitly grant only intended roles.
- For functions that remain callable, verify authorization inside the function. Do not rely on the function name or caller-supplied IDs.
- Test non-member, unrelated learner, ordinary authenticated learner, authorized teacher/admin and server execution as appropriate.

Do not revoke all SECURITY DEFINER execution indiscriminately. Some functions may be trigger entry points or intentional RPCs.

### 3. Tables without RLS policies

The same advisor snapshot reports three RLS-enabled tables without policies: `challenge_answer_keys`, `feedback_rate_limits` and `lesson_quiz_attempts`.

**Required before release**
- Confirm whether each table is server-only or intended for direct client access.
- Inspect table grants and all application call sites.
- If server-only, verify that anon/authenticated have no effective access and that server operations use protected credentials.
- If client access is required, add least-privilege policies and cross-account regression tests.

RLS enabled with no policies is normally deny-by-default for direct client access, but grants and privileged server paths still need verification.

### 4. Password protection and broader database hygiene

The advisor reports leaked-password protection disabled. Earlier performance review also identified unindexed foreign keys, multiple permissive policies, RLS init-plan warnings and unused indexes.

These are not all equivalent release blockers. The advisor's leaked-password check is a configuration warning, not proof of a compromised account. Prioritise the password-protection setting and authorization findings first; handle performance/index cleanup separately with query-plan evidence and migration review.

## Account deletion release gate

PR #553 has successful CI and Android build runs on its current branch snapshot, including the database contract job. The branch is substantially behind current `main`, so these checks do not prove it integrates with the current application.

Before merge:
- Rebase/port the implementation onto a fresh branch from current `main`.
- Preserve the database contract and integration tests.
- Re-run typecheck, lint, unit tests, build, Android build and database tests.
- Verify the complete data dependency and storage-object inventory.
- Keep the worker disabled until the production migration, operational secret, monitoring, retries and manual recovery path are reviewed.
- Test request, pending-write barrier, worker lease, partial failure, retry and final account state using disposable accounts.
- Confirm local-device cleanup and the actual user-facing status/limitations.

Do not enable the production worker or apply production migrations as part of this documentation work.

## Evidence and release decision

A finding is considered closed only when all of the following exist:
1. A reviewed migration or documented reason no migration is needed.
2. Automated regression coverage for the intended allow and deny cases.
3. A controlled test using distinct identities/roles.
4. A fresh read-only verification of effective grants and policies after deployment.
5. A named owner and rollback procedure.

A passing CI run on an old branch, an RLS-enabled flag, or a Security Advisor score alone is not proof of isolation.

## Explicit non-actions

This document does not authorize or perform:
- production SQL, policy, grant, data or storage changes;
- production worker activation;
- merges, releases or deployments;
- deletion/export of learner records;
- claims that a suspected exposure was exploited.

## Next engineering sequence

1. Reproduce and close the profile isolation issue in a disposable Supabase project.
2. Audit the SECURITY DEFINER function grants and call sites.
3. Confirm the three no-policy tables are truly server-only or add tested policies.
4. Port account deletion onto current `main` and rerun all checks.
5. Review the combined release evidence before any production action.


### 1A. Follow-up verification: effective profile access (2026-11-16)

A second read-only query against the live project confirmed the effective shape of the issue:

- `public.profiles` contains private or learner-specific fields including `curriculum_subjects`, `curriculum_profile`, `subjects`, `study_level`, `study_style`, `daily_goal_minutes`, `weekly_goal_minutes`, `education_stage`, `curriculum_board`, `qualification`, `syllabus_code`, `syllabus_year` and `language`.
- `Public leaderboard read` is a SELECT policy for the `public` role with `USING (true)`. It therefore applies to authenticated users as well as anonymous users.
- Authenticated clients have SELECT access across the profile columns. The narrow leaderboard projection does not restrict direct reads from the base table.
- The `leaderboard_profiles` view is currently `security_barrier=true` and `security_invoker=true`, selecting only `id, username, xp, season_xp, level, streak`. Anonymous access is granted only to those six base-table columns; authenticated access remains broader.
- The app leaderboard reads the view. The curriculum profile API and curriculum resolver read/write the signed-in user's row using `id = user.id`. Cortex student context reads a fixed set of profile columns for the authenticated user. These filters are useful but are not a substitute for database-enforced row isolation.

This confirms an access-control defect in the current configuration, not evidence that another student actually accessed the data. The read-only query did not enumerate data rows or attempt cross-account access.

**Implementation decision:** do not add a speculative grant/policy migration yet. With an invoker-security view, changing the SELECT policy to owner-only would also constrain the leaderboard view to the caller's own row. Restoring cross-user leaderboard access requires a separately reviewed public-safe projection mechanism, such as a narrowly scoped, explicitly tested RPC/view design. The replacement must preserve only the six approved leaderboard fields and must not expose curriculum or learning-preference columns.

**Required test matrix before a migration is approved:** anon can read only the six leaderboard fields; learner A can read and update only A's permitted profile data; learner B cannot read or mutate A's private profile; teacher and admin access is limited to explicitly authorized institution/relationship workflows; service-role server operations continue to work. Test both direct base-table access and the leaderboard projection. Run this against a disposable database with distinct test identities, then verify effective privileges and policies again after deployment.

The current repository also contains a SQL regression-test pattern under `supabase/tests/` that wraps service-role fixtures in a transaction and rolls back. That pattern is useful for data-contract tests, but it is not by itself sufficient to prove cross-role RLS behaviour; the new profile test must explicitly switch to the relevant API roles and set distinct authenticated JWT claims.


### 2A. Follow-up verification: SECURITY DEFINER function inventory (2026-11-16)

A read-only catalog inspection retrieved the definitions, owners, ACLs and configured search paths for the nine functions in the advisor finding. All nine are owned by `postgres` and set a function-level search path.

**Trigger-only functions:** `apply_lesson_vote()`, `guard_teacher_tutorial_transition()` and `publish_lesson_to_library()` return `trigger`. Their current ACLs include `PUBLIC`, `anon` and `authenticated`. PostgreSQL trigger functions cannot be invoked as ordinary PostgREST RPCs, so the advisor's EXECUTE warning should not be described as proof that anonymous users can call these trigger bodies directly. Their client EXECUTE grants are still unnecessary and should be removed in a reviewed migration after confirming no non-trigger invocation path exists. Keep trigger execution itself intact.

**Authenticated RPCs with visible identity checks:**
- `claim_lesson_quiz_attempt(uuid, integer[])` requires `auth.uid()`, bounds and validates answer selections, and locks an attempt belonging to that user.
- `complete_lesson_quiz_attempt(uuid)` requires `auth.uid()`, loads the attempt and lesson by the same user ID, validates the stored question/answer shape, and completes the owned attempt.
- `has_role(uuid, text)` rejects unauthenticated calls and rejects a caller-supplied user ID that differs from `auth.uid()` unless the JWT role is `service_role`.
- `publish_teacher_tutorial(uuid, integer)` requires an authenticated admin role and updates only the expected verified tutorial version.
- `redeem_teacher_invite(text)` requires authentication, hashes the supplied code for lookup, checks unused/unexpired status and assigns the teacher role to `auth.uid()`.
- `review_teacher_tutorial(uuid, integer, text, text)` requires teacher/admin role, validates verdict/note and locks the expected in-review version before writing the review.

This is a source-level review of the live function definitions, not a complete exploit assessment. The six RPCs should retain explicit authenticated grants only if their API call sites are confirmed. Their ownership, cross-table effects, concurrency behaviour and negative authorization cases still require tests. In particular, test wrong-user attempt IDs, non-teacher review/publish attempts, expired/reused invites, version races, and spoofed `has_role` user IDs.

The two quiz functions use `search_path = public, pg_catalog`; the other functions use `search_path = public`. Before changing any function, review object resolution and schema CREATE privileges, then prefer fully qualified references and a hardened search path where compatible. Do not blanket-revoke authenticated execution from the six RPCs until application call sites and regression tests are complete.
