# Shadecode Student Offline Sync Contract

Status: **implemented for the current offline stores; extension points documented**.

## Scope

The offline layer is account-scoped and currently supports durable local reads plus queued writes for:

- `tasks`
- `subjects`
- `learn_lessons` progress

The generic mutation queue is intentionally allowlisted. It must not become a generic arbitrary-table write API.

## Identity and authorization

1. A mutation is queued only while a Supabase-authenticated user exists.
2. Every queued mutation carries the authenticated `ownerId`.
3. Sync only reads mutations belonging to the currently authenticated user.
4. A supplied `payload.user_id`, when present, must equal the authenticated user.
5. Delete/update operations require an explicit record id and add `user_id = auth.uid()` to the server query.
6. Inserts/upserts force `user_id` to the authenticated user.
7. Supabase RLS remains authoritative. Offline state is never treated as an authorization source.

## Sync lifecycle

`authenticated session -> start auto-sync -> flush queued mutations -> refresh local caches`

- A sync is attempted when connectivity returns.
- A periodic retry runs every 30 seconds while online.
- Concurrent sync runs are coalesced by an in-progress guard.
- Signing out stops automatic sync.
- Failed mutations remain queued and record an attempt/error rather than being silently discarded.

## Conflict policy

The current policy is **server-authoritative last successful write** for the supported simple records.

This is deliberately conservative. Do not introduce field-level merges until the affected entity has an explicit version/conflict model.

### Required future versioning

For exams, focus sessions, timetable entries, achievements, XP and richer lesson state, add:

- `updated_at` or a monotonic revision
- operation id / idempotency key
- tombstone for deletes
- deterministic conflict policy
- retry classification (transient vs permanent)

## Cache rules

- Local records are scoped by user id.
- A local record from another account must never be returned to the current account.
- Remote reads populate the local cache after successful authentication.
- Empty local state is not proof that remote state is empty.

## Extension order

Add new offline entities in this order:

1. Lesson progress and lesson completion
2. Timetable
3. Focus sessions
4. Exam-session autosave
5. XP/achievement reconciliation
6. Selected downloadable educational content

Each addition must include an explicit mutation contract, RLS verification, conflict policy, tests, and migration/backfill requirements before being added to the allowlist.

## P2P boundary

Peer-to-peer exchange is **not** part of the current sync protocol. Future P2P transport may exchange permitted educational assets, but cloud synchronization remains the authoritative account/state reconciliation path until a separate trust and encryption design is approved.
