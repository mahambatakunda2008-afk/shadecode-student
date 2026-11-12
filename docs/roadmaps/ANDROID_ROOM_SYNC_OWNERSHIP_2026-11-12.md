# Android Room Sync Queue Ownership Hardening

Date: 2026-11-12

## Changes committed directly to the default branch

- Room database version advanced from 2 to 3.
- Added nullable `accountId` and stable client-generated `operationId` to `pending_sync`.
- Added migration 2→3. Existing rows are retained and receive deterministic `legacy-<row id>` operation identifiers.
- Existing rows are deliberately assigned a null account owner. The old schema did not record ownership, so assigning them to whichever student signs in next would risk cross-account data disclosure or corruption.
- Added `pendingForAccount(accountId)`; the sync worker now reads only rows owned by the currently authenticated account.
- New lesson-progress queue entries include the current session's user ID.
- Removed the immediate duplicate API write from the lesson reader. The durable queue is now the single write path, and WorkManager is scheduled after enqueue.

## Safety behavior

- Rows created after this migration are account-scoped.
- Legacy rows with null ownership remain on-device and are not automatically replayed. They need an explicit, trustworthy reconciliation path before they can be assigned to an account.
- Sign-out still preserves offline academic work; this change does not delete pending records.
- The two pre-existing queues remain separate. This change does not claim to consolidate them.
- `operationId` is persisted locally for future idempotency support. The current lesson-progress API does not receive an idempotency key in this change, so server-side exactly-once delivery is not claimed.

## Verification limits

- Source changes were committed directly to the default branch.
- No Android Gradle build, Room migration test, emulator run, or physical-device test was executed in this work slice.
- CI status must be interpreted by platform. A Vercel status is not evidence of Android compilation.
- Next verification should include a real v2→v3 Room migration test with existing queued rows, a fresh-install database test, account A/B isolation, offline enqueue/reconnect, and process-death recovery.

## Commits

- Room v3 schema and migration: `3677a8bb5a1869219a261c53c16030f59946ded3`
- Account-scoped worker: `705c12ea61cede1d73b8181b9d461051a60fdaa8`
- Lesson progress uses the account-scoped durable queue: `54152fc16e03a0cd85e0065bd3ba384e76b32fff`
- Room schema default alignment: `32004041699fa797d83b0402da31bef2c5a69b21`
- WorkManager scheduling after enqueue: `a783051ce4dc90248d11a259d13ccfc626c4a589`
