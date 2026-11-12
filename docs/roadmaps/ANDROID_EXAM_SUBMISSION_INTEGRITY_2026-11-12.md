# Android exam submission integrity

Date: 2026-11-12

## Goal

A native exam must survive a force-close or lost HTTP response during marking without losing the learner's answers or creating a second marked result when the learner retries.

## Implemented

### Android local durability

- Room advanced from schema v5 to v6.
- `exam_attempts` now stores a stable `attemptId` and a durable `submissionPending` flag alongside the paper, questions, answers and timer state.
- Migration 5→6 adds `submissionPending INTEGER NOT NULL DEFAULT 0`, preserving existing attempts as drafts.
- The attempt ID is generated when a new native simulation paper is created, retained on restore, and passed unchanged on every submission retry.
- Before the first network request, the exact answer payload and `submissionPending=true` are committed to Room.
- A failed or ambiguous request leaves the attempt frozen and retryable. The student cannot silently edit answers under an already-claimed attempt ID.
- On process recreation, the app restores the pending flag and tells the student the same submission ID will be reused.
- A successful response clears the local recoverable attempt after the report is loaded.

### Server-side idempotency

- The native marking route now requires a stable attempt ID.
- It canonicalizes and SHA-256 hashes subject, questions and answers.
- It uses the existing `exam_submission_ledger` database migration and `claim_exam_submission` RPC to claim the attempt before invoking Cortex.
- A completed duplicate returns the stored report without invoking marking again.
- A duplicate while another worker owns the lease receives HTTP 409.
- Reusing an attempt ID with different answers is rejected as a payload conflict.
- A verified report is finalized through the existing `complete_exam_submission` RPC, which atomically stores the result and enqueues the durable completion outbox event.
- The existing outbox worker handles downstream Cortex memory, mastery and analytics projections with retryable leases.

## Relevant existing database migrations

These were already present in the repository and are now used by the native marking route:

- `20261112190000_exam_submission_ledger.sql`
- `20261112200000_atomic_cortex_exam_score.sql`
- `20261112210000_exam_completion_outbox.sql`
- `20261112220000_exam_completion_outbox_service_role_policy.sql`
- `20261112230000_atomic_exam_topic_mastery_projection.sql`
- `20261112240000_durable_exam_analytics_event.sql`

The database migrations must be applied to the target Supabase project for server-side idempotency and outbox finalization to work. A Git commit alone does not apply database migrations.

## Commits

- Native route claim/finalize integration: `82f03e83559740b4d0036be776558a67a9d6551d`
- Canonical payload hashing hardening: `b76dab315cf2c0a0a88819097942d73c162b725b`
- Stable attempt ID persisted in the Android store: `9f51bd2339ce56fea4b4a5f8c09e18b650902af71`
- Android API sends attempt ID: `1494e05f048e74280a405a0c91cb724fc327adb1`
- Room v6 submission-pending field and migration: `c37c8ab1ec3a62733e93498a8971316ae4597d16`
- Store persists pending state: `33b86430530f6ab16fe0af56d4e05fbde0eb53b6`
- Compose checkpoint-before-submit and safe retry: `574417632b0a27e40e215b3b02737e51cfc809a4`

## Verification status

- Re-fetched all five changed source files after the commits.
- Confirmed Room version 6, migration 5→6, persisted pending state, stable attempt ID restore, Room checkpoint before HTTP request, client ID forwarding, server claim/finalize RPC calls, and duplicate-result replay path.
- No Android Gradle build, TypeScript build, Supabase migration application, SQL regression test, emulator test or physical-device force-close test was executed in this work slice.
- The server-side protection depends on the existing Supabase migrations being applied. Verify their deployed status before treating duplicate submission protection as live in production.
- The route currently records native simulation completion with `timeTaken: 0` and an empty topic-score list because the native client does not yet send per-question timing or topic score projection data. The result itself is durably stored.
- If a server worker dies while holding a claim, the existing ledger permits lease reclamation after three minutes. The client should retry the same ID and exact payload.

## Next verification

1. Confirm all six referenced Supabase migrations are applied in the production project.
2. Run the SQL ledger/outbox regression tests against a disposable database.
3. Build the Android app and run a v5→v6 Room migration test.
4. Simulate process death after the Room checkpoint but before the response.
5. Retry the same attempt and confirm the server returns the stored report with no second marking execution.
6. Submit a changed answer under the same attempt ID and confirm the server rejects it.

## Live Supabase verification

Checked the connected `shadecode-student` Supabase project after the implementation:

- The production migration history includes the exam submission ledger, atomic Cortex score, completion outbox, outbox service-role policy, topic mastery projection, and durable analytics migrations.
- `public.exam_submission_ledger` and `public.exam_completion_outbox` exist.
- Both `claim_exam_submission(uuid,text,text)` and the six-argument `complete_exam_submission(uuid,text,text,uuid,jsonb,jsonb)` RPC exist.
- The service role has EXECUTE on both RPCs.
- RLS is enabled on `exam_submission_ledger`.

This confirms the required database objects and privileges exist in the connected project. It does not yet prove a full live marking request/replay end-to-end.
