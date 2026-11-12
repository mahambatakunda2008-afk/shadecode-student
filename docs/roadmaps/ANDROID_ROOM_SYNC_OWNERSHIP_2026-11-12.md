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


## Follow-up: isolate cached lesson progress (Room v4)

- Advanced Room from v3 to v4.
- Changed `lesson_progress` to a composite primary key of `accountId + lessonId`.
- Updated progress reads and writes to always include the authenticated `session.userId`.
- Added migration 3→4. Existing progress rows are retained under the empty, unassigned account namespace. They are not exposed to any signed-in account because normal reads require an exact account ID.
- The lesson and subject tables remain shared curriculum caches, not learner-owned records. They contain lesson/subject content; learner progress is now separately account-scoped.
- Task snapshots, timetable snapshots, profile snapshots, and the Preferences-based pending-operation queue were already keyed by account ID in `NativeStore`; this follow-up did not rewrite them.

### Additional commit

- Room v4 account-scoped lesson progress: `6861c7c92927af96498ca05d3440e04ef818c4ac`
- Reader account-scoped progress access: `fcff32e8fa77498493d0f14d5aa66271d9a749a2`

### Remaining migration caveat

Legacy lesson-progress rows are preserved but held in the unassigned namespace. An explicit recovery/export path is still needed if the original owner must reclaim that progress. No automatic assignment is safe because the old database did not store the account ID.

## Follow-up: durable exam-attempt recovery (Room v5)

- Advanced the native Room database from v4 to v5 with an `exam_attempts` table.
- Exam snapshots are keyed by the authenticated account ID. The stored record includes a stable attempt ID, subject, paper JSON, question JSON, answer JSON, remaining seconds, active/taking state, save timestamp, and deadline.
- `NativeExamAttemptStore` now reads and writes through Room instead of using SharedPreferences as the primary store. A completed Room write is committed before the checkpoint call returns.
- The first read for an account imports that account's existing `native_exam_attempts_v1` SharedPreferences snapshot. The legacy key is removed only after Room successfully saves the imported record. No unscoped snapshot is assigned to a learner.
- The existing Compose recovery flow continues to restore the paper, questions, answers, timer deadline, and subject. The timer deadline remains wall-clock based, so time continues to elapse while the app is closed.
- This schema currently stores one active/recoverable exam attempt per account, matching the existing one-snapshot-per-user behavior. It is not yet an exam history/archive.
- Failed marking keeps the local attempt available for retry. This does not guarantee exactly-once server submission: the marking endpoint has not been given a server-enforced idempotency key in this change.

### Commit

- Room v5 exam-attempt table and migration: `c4d9c470f2b1628ea8b7503868270ce9bd6aae6d`
- Room-backed account-scoped exam recovery store: `6e45962859a1364e2b4a5f8c09e18b650902af71`

### Verification limits and next checks

- Source was re-fetched after the commits. Room is at schema version 5, migration 4→5 is registered, and the simulation still has one read, write, and clear integration point.
- No Gradle build, migration test, emulator test, or force-close test was run. Do not treat this as device-verified.
- Next verification: migrate a real v4 database, import a legacy snapshot, force-stop during an active attempt, restore after process death, switch between two accounts, and simulate a marking timeout followed by retry.
