# Offline Sync Architecture Audit

Date: 2026-08-16
Status: discovery/audit complete

## Verified existing pieces

The repository contains a `src/lib/local-first/` implementation with:

- a local-first store;
- operation records with monotonic per-record versions;
- tombstones for deletes;
- deterministic conflict resolution using version, timestamp and device ID;
- encrypted backup/export support;
- a backup restore path.

The architecture document also defines a local-first direction.

## Critical finding

The local-first implementation appears to be **library infrastructure rather than an application-wide source of truth**.

Repository code search found no references to the local-first store/import path from application code. That means the existence of a good local store does not yet prove that Tasks, Timetable, Lessons, Exam sessions, progress, XP, achievements or Cortex memory actually use it for offline mutations.

This is the key distinction:

`offline-capable library` ≠ `offline-first product`.

## Current sync boundary

The existing backup path is a user-controlled encrypted backup mechanism. It should not be treated as continuous synchronization.

The next architecture should explicitly separate:

1. **Local state** — authoritative while offline.
2. **Operation queue** — durable mutations waiting for synchronization.
3. **Remote replica** — Supabase records synchronized after connectivity returns.
4. **Conflict resolver** — deterministic merge rules per entity.
5. **Backup** — recovery artifact, independent of normal synchronization.

## Required sync contract

Every offline-capable entity needs:

- stable record ID;
- owner/user ID;
- local version or mutation sequence;
- updated timestamp;
- deletion tombstone where deletes are possible;
- sync status;
- mutation origin/device ID;
- deterministic conflict policy.

Do not introduce a universal last-write-wins rule blindly. Tasks, progress counters, XP, achievements, exam answers and text content have different merge semantics.

## Entity merge policies

| Entity | Recommended policy |
|---|---|
| Tasks | field-level or versioned record merge |
| Timetable | record/version merge |
| Lessons | immutable content + metadata merge |
| Exam session | append-only answer events + finalization guard |
| XP | server-validated event ledger, not client overwrite |
| Achievements | idempotent event-derived unlocks |
| Streak | server reconciliation from verified study events |
| Cortex memory | append-only/versioned evidence with deduplication |
| User profile | explicit field-level conflict rules |

## Security requirements

- Never trust a client to award arbitrary XP.
- Never let an offline client overwrite another user's records.
- Encrypt sensitive local data where practical.
- Keep device identity separate from user identity.
- Authenticate synchronization requests.
- Validate every mutation server-side when it reaches Supabase.
- Treat restored backups as untrusted input until validated.

## P2P boundary

Peer-to-peer exchange should not be part of the first sync implementation.

The sync protocol should be designed so future peer exchange can transport signed/encrypted permitted records, but the current product should work correctly with:

`device → local queue → cloud → device`

before adding:

`device ↔ device`.

## Implementation order

### O1: integration inventory

Identify every stateful feature and whether it currently reads/writes local-first state.

### O2: mutation adapters

Introduce one adapter per supported entity instead of rewriting the whole application around a generic store.

### O3: durable sync queue

Persist pending mutations and retry after reconnect.

### O4: server reconciliation

Add idempotency keys, authorization, validation and entity-specific conflict handling.

### O5: offline UX

Show pending/synced/conflict states without blocking normal study.

### O6: multi-device synchronization

Only after single-device offline behavior is reliable.

## Acceptance criteria

Offline-first is considered implemented only when a learner can:

- create/edit/delete supported study data while offline;
- close/reopen the app without losing the changes;
- reconnect and synchronize automatically;
- retry failed mutations safely;
- resolve supported conflicts deterministically;
- avoid duplicate XP/achievement effects;
- resume an interrupted exam safely;
- see a clear sync state;
- keep working if synchronization is temporarily unavailable.

## Conclusion

The project already has useful local-first primitives. The actual gap is integration, durable mutation synchronization and entity-specific reconciliation. Building peer-to-peer networking now would be premature.

## Roadmap status

The offline sync discovery/audit task is complete. The next engineering work is application integration and a durable mutation queue, not peer-to-peer networking.