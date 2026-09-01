# Multi-Device Sync Test Matrix

## Core invariants

- Local writes are durable before network synchronization.
- Operations are account-scoped.
- Concurrent updates use deterministic ordering.
- Tombstones prevent stale updates from resurrecting deleted records.
- Duplicate delivery is idempotent.
- Server-authoritative conflicts hydrate the winner locally.

## Required scenarios

| Scenario | Expected result |
| --- | --- |
| Two devices update the same record concurrently | Same deterministic winner on both devices |
| Delete races with older update | Delete wins and stale update cannot resurrect record |
| New update follows delete | New update remains eligible |
| Same operation delivered twice | One logical effect |
| Offline mutation then reconnect | Mutation syncs without data loss |
| Stale server revision | Client reconciles with server winner |
