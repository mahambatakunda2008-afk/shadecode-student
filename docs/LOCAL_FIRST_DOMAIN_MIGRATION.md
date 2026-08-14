# Local-First Domain Migration

## Current state

Shadecode Student now has a local-first foundation, but several application surfaces still call Supabase directly. The existing `src/lib/offline/sync.ts` already performs local-first reads for some task/progress flows, but its write path still reconciles directly to Supabase. The goal is to make local state authoritative and make synchronization an asynchronous consequence of local mutations.

## Migration rule

For each personal-data domain:

```text
UI -> local repository -> local operation/event -> UI updates immediately
                         |
                         +--> sync queue -> optional cloud backup/relay
```

The UI should not wait for Supabase before considering a normal personal-data mutation successful.

## Tasks / Subjects first

Tasks and subjects are the first migration target because they are high-frequency, low-risk personal data.

### Tasks

- local IndexedDB record is authoritative;
- create locally first;
- complete locally first;
- delete only after tombstone support exists;
- sync asynchronously;
- resolve conflicts using operation metadata rather than last network response;
- never require an online round trip for normal task interaction.

A device-first task adapter now exists at `src/lib/local-first/tasks.ts`. It intentionally refuses hard deletion until sync tombstones are implemented, because a delete that exists only locally cannot safely propagate to another device or peer.

## Next implementation steps

1. Add subjects to the same local repository layer.
2. Introduce operation tombstones for deletes.
3. Replace direct task/subject Supabase calls in the Tasks UI with local repositories.
4. Add migration-on-read for users who already have server-side tasks.
5. Make the sync worker consume local operations rather than treating Supabase as the source of truth.
6. Add deterministic conflict handling.
7. Add tests for offline create/complete/delete/reconnect behavior.

## Conflict model

Do not rely on naive `updated_at` last-write-wins for all domains.

Use an operation record with at least:

```text
operation_id
device_id
user_id
entity_type
entity_id
operation_type
payload
logical_clock / sequence
timestamp
```

For simple task fields, deterministic last-writer selection may be acceptable initially. For counters such as XP, prefer event-based accumulation rather than mutable totals.

## Why deletes need tombstones

If Device A deletes a task and then Device B comes online with an older copy, a normal sync can accidentally recreate the deleted task. A tombstone records that the entity was intentionally deleted and allows that fact to replicate until all relevant peers have acknowledged it or the retention window expires.

## Migration safety

The migration must be incremental. Existing server data should be imported into the local store before the UI stops depending on Supabase. A migration marker/version should prevent repeated imports from duplicating records.

## ShadeNet readiness

This domain migration is also preparation for cross-user P2P content. Personal task operations and public educational resources must remain separate. The task repository should never publish private task data to ShadeNet.

Once the personal-data path is local-first, the next independent layer is the content-addressed resource store for explicitly shareable lessons, videos, question sets, and study packs.