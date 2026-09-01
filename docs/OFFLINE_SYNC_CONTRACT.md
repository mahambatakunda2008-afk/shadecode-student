# Shadecode Student Offline Sync Contract

Status: **implemented for the current offline stores; extension points documented**.

## Scope

The offline layer is account-scoped and currently supports durable local reads plus queued writes for:

- `tasks`
- `subjects`
- `learn_lessons` progress
- `education_profile`

The generic mutation queue is intentionally allowlisted. It must not become a generic arbitrary-table write API.

## Identity and authorization

1. A mutation is queued only while a Supabase-authenticated session exists.
2. Every queued mutation carries the authenticated `ownerId`.
3. Sync only reads mutations belonging to the currently authenticated user.
4. A supplied `payload.user_id`, when present, must equal the authenticated user.
5. Delete/update operations require an explicit record id.
6. The server RPC derives ownership from `auth.uid()` and never trusts a client-supplied owner id.
7. Supabase RLS remains authoritative. Offline state is never treated as an authorization source.

## Sync lifecycle

`local mutation -> operation journal -> mutation queue -> /api/sync -> revision-checked RPC -> acknowledge -> persist server revision`

- A sync is attempted when connectivity returns.
- A periodic retry runs every 30 seconds while online.
- Concurrent sync runs are coalesced by an in-progress guard.
- Failed mutations remain queued and record an attempt/error rather than being silently discarded.
- Client auth lookup uses the locally persisted Supabase session so normal queue inspection does not require a network round trip.

## Versioning and OCC

There are **two different clocks** and they must never be conflated:

- `LocalRecord.version` and `LocalOperation.lamport` are local Lamport-clock values used for deterministic device ordering.
- `LocalRecord.syncVersion` and `LocalOperation.baseVersion` represent the server-side per-record revision used for optimistic concurrency control.

The server stores revisions in `sync_revisions(user_id, store, record_id)` and applies mutations atomically through `apply_sync_mutation(...)`.

A mutation is accepted only when `baseVersion === currentVersion`. On success the server increments the record revision and the client persists the returned revision in `syncVersion`. A stale mutation receives a conflict response and is reconciled against the server winner.

This separation prevents an unrelated local mutation on another entity from accidentally becoming the base version for a record.

## Conflict policy

The current policy is **server-authoritative last successful write** for the supported simple records.

When optimistic concurrency detects a stale base revision:

1. Keep the server revision as the winner.
2. Record a `LocalConflict` with the rejected local operation as loser.
3. Hydrate the winning server payload when available.
4. Acknowledge/remove the rejected transport mutation so it cannot loop forever.

Do not introduce field-level merges until the affected entity has an explicit merge model.

## Cache rules

- Local records are scoped by user id.
- A local record from another account must never be returned to the current account.
- Remote reads populate the local cache after successful authentication.
- Empty local state is not proof that remote state is empty.
- Server revision metadata must survive hydration and successful sync.

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

Peer-to-peer exchange is **not** part of the current sync protocol. Future P2P transport may exchange permitted educational assets, but cloud synchronization remains the account/state reconciliation path until a separate trust and encryption design is approved.
