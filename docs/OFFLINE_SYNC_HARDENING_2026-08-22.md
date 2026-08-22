# Offline Sync Hardening Follow-up

Date: 2026-08-22
Status: implemented on `cortex/offline-sync-hardening`

## Finding fixed

The existing offline progress store used `lessonId` as its IndexedDB primary key. Progress is personal data, so the key was not sufficiently scoped to the authenticated account.

On a shared device, two accounts studying the same lesson could collide in the local `progress` store. The surviving record was whichever write happened last. The sync layer did perform server-side `user_id` checks, but the local read path could still expose the wrong cached progress before a server read occurred.

## Fix

- Added a new account-scoped `progressByUser` IndexedDB store.
- Keys are deterministic `userId:lessonId` pairs.
- Added a version-4 IndexedDB migration that copies surviving legacy rows into the account-scoped store when their `userId` and `lessonId` are present.
- All progress reads/writes and sync acknowledgements now require the user ID.
- Offline sync filters pending progress/tasks/subjects to the currently authenticated account before writing to Supabase.
- Reused the existing authenticated Supabase boundary rather than treating IndexedDB state as an authorization source.
- Added `onversionchange` handling so stale database connections close cleanly during upgrades.

## Remaining architecture boundary

This is a hardening pass, not a claim that every feature is fully offline-first. The existing audit remains authoritative: full offline integration still needs application-wide mutation adapters, entity-specific reconciliation, idempotency for event-like operations, and explicit sync/conflict UI.

The next high-value offline targets are:

1. exam-session recovery;
2. lesson/question download and eviction policy;
3. durable server-validated event synchronization for XP and achievements;
4. visible pending/synced/conflict state;
5. multi-device reconciliation after single-device behavior is proven.

P2P remains out of scope until these foundations are reliable.
