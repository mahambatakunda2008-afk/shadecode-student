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

The 2026-11-16 Security Advisor snapshot reports three SECURITY DEFINER functions executable by `anon` and nine executable by `authenticated`.

**Required before release**
- Enumerate each function's signature, owner, grants, search path, body and call sites.
- Classify each as intentionally client-callable, server-only, or trigger-only.
- Revoke unnecessary client EXECUTE grants and explicitly grant only intended roles.
- For functions that remain callable, verify authorization inside the function. Do not rely on the function name or caller-supplied IDs.
- Test non-member, unrelated learner, ordinary authenticated learner, authorized teacher/admin and server execution as appropriate.

Do not revoke all SECURITY DEFINER execution indiscriminately. Some functions may be trigger entry points or intentional RPCs.

### 3. Tables without RLS policies

The same advisor snapshot reports three RLS-enabled tables without policies, including `lesson_quiz_attempts`.

**Required before release**
- Confirm whether each table is server-only or intended for direct client access.
- Inspect table grants and all application call sites.
- If server-only, verify that anon/authenticated have no effective access and that server operations use protected credentials.
- If client access is required, add least-privilege policies and cross-account regression tests.

RLS enabled with no policies is normally deny-by-default for direct client access, but grants and privileged server paths still need verification.

### 4. Password protection and broader database hygiene

The advisor reports leaked-password protection disabled. Earlier performance review also identified unindexed foreign keys, multiple permissive policies, RLS init-plan warnings and unused indexes.

These are not all equivalent release blockers. Prioritise the password-protection setting and authorization findings first; handle performance/index cleanup separately with query-plan evidence and migration review.

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
