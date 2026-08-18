# Offline Sync Architecture Audit

Date: 2026-08-18
Status: **architecture audit complete; application integration is partially implemented and actively being hardened**

## Verified existing pieces

The repository contains a local-first/offline implementation with:

- durable local storage;
- operation records with monotonic/versioned local state where supported;
- tombstones in the local-first layer;
- deterministic conflict-resolution primitives;
- encrypted backup/export support;
- a durable IndexedDB mutation queue;
- authenticated, account-scoped synchronization;
- cached reads for supported study data;
- an offline UI shell.

The current generic mutation queue explicitly allowlists `tasks`, `subjects` and `learn_lessons`. The sync layer retries queued mutations after connectivity returns and on a periodic online interval.

## Important distinction

The repository has moved beyond an offline-capable library, but it is **not yet fully offline-first across the whole product**.

The current supported path is:

`authenticated device → local cache / mutation queue → authenticated Supabase sync → refreshed local state`

That path is real for the currently allowlisted entities. Other stateful features still require explicit integration rather than being assumed to work offline.

## Current sync boundary

The architecture explicitly separates:

1. **Local state** — usable while offline.
2. **Operation queue** — durable mutations waiting for synchronization.
3. **Remote replica** — Supabase records synchronized after connectivity returns.
4. **Conflict resolver** — entity-specific rules as richer entities are added.
5. **Backup** — recovery artifact, independent of normal synchronization.

The backup mechanism must not be treated as continuous synchronization.

## Current supported entities

| Entity | Local reads | Queued writes | Current policy |
|---|---:|---:|---|
| Tasks | Yes | Yes | server-authoritative successful write |
| Subjects | Yes | Yes | server-authoritative successful write |
| Lesson progress | Yes | Yes | server-authoritative successful write |
| Timetable | Not yet fully integrated | Not yet allowlisted | explicit integration required |
| Focus sessions | Not yet fully integrated | Not yet allowlisted | server-validated event model required |
| Exam sessions | Not yet fully integrated | Not yet allowlisted | append-only answer events + finalization guard |
| XP | Not yet fully integrated | Not allowed | server-validated event ledger |
| Achievements | Not yet fully integrated | Not allowed | idempotent event-derived unlocks |
| Cortex memory | Not yet fully integrated | Not allowed | append-only/versioned evidence |

## Security requirements

- Never trust a client to award arbitrary XP.
- Never let an offline client overwrite another user's records.
- Queue mutations only for an authenticated account.
- Scope local records and queued operations by user ID.
- Authenticate synchronization requests.
- Validate every mutation server-side when it reaches Supabase.
- Treat restored backups as untrusted input until validated.
- Keep the generic offline mutation API allowlisted. Do not turn it into arbitrary-table write access.

## User-facing sync state

The offline shell now surfaces:

- offline state;
- locally saved pending changes;
- exhausted automatic retries requiring attention;
- an explicit retry/sync action when connectivity is available.

This makes the queue observable instead of silently hiding failed persistence work.

## Remaining implementation order

### O1: completed

Architecture and current mutation boundaries have been audited and documented.

### O2: in progress

Continue adding mutation adapters only for explicitly approved entities. Each adapter must preserve authentication, RLS and entity-specific semantics.

### O3: in progress

The durable queue and retry/backoff path exist. Remaining work is stronger server-side idempotency for operations where duplicate execution could have financial, XP, achievement or assessment consequences.

### O4: required before broad expansion

Add explicit version/revision and operation-id semantics for richer entities. Do not rely on blind last-write-wins for exam answers, XP, achievements, streaks or Cortex evidence.

### O5: substantially improved

Offline status is visible to the learner. Continue adding conflict-specific messaging as richer entities become offline-capable.

### O6: later

Multi-device synchronization should follow reliable single-device offline behavior. Peer-to-peer exchange remains a separate future protocol and is not a dependency.

## Acceptance criteria

Offline-first is considered broadly implemented only when a learner can:

- create/edit/delete supported study data while offline;
- close and reopen the app without losing those changes;
- reconnect and synchronize automatically;
- retry failed mutations safely;
- see pending and failed synchronization state;
- resolve supported conflicts deterministically;
- avoid duplicate XP/achievement effects;
- resume an interrupted exam safely;
- keep working if synchronization is temporarily unavailable.

## Conclusion

The previous audit correctly identified the architectural gap. Since then, the repository has a real durable mutation queue, authenticated synchronization and cached local reads for an initial allowlist of entities. The remaining work is **expanding integration safely**, not inventing another offline subsystem and not starting P2P prematurely.
