# Offline Sync Implementation Status

Updated 2026-08-31.

## Completed in the current engineering pass

- Account-scoped durable mutation queue with owner checks.
- Account-safe Cortex learning-event queueing on the active branch.
- Bounded exponential retry and permanent-failure state.
- Safe failed-mutation reset for the authenticated account.
- Local-first task/subject/progress adapters remain the source of truth for supported flows.
- Durable local operation IDs using device ID + sequence.
- Lamport-style local revisions on local records and operations.
- Explicit entity-specific conflict policy definitions.
- Version/device metadata persisted with queued mutations.
- Account-scoped hydration and protection against cross-user local record overwrite.
- Reusable sync-status UI with offline, pending, failed and manual-sync states.
- Regression tests for conflict policy semantics.

## Important boundary

The repository now has the protocol primitives for idempotency and revision-aware synchronization, but the generic Supabase transport is not yet a complete transactional server-side mutation adapter. `0021_offline_sync_protocol.sql` stores durable mutation receipts and enforces account ownership, but entity writes still need to be performed by explicit server adapters so the receipt and the entity mutation can be committed atomically.

Therefore the remaining release work is:

1. Add explicit server adapters for tasks, subjects, progress, projects and project evidence.
2. Make each adapter transactionally idempotent using the mutation receipt key.
3. Return structured `conflict` responses when the base revision is stale.
4. Add a conflict-resolution inbox/UI for non-mergeable records.
5. Wire the adapters into `OfflineSync` instead of generic direct table writes.
6. Add browser E2E tests covering offline create/edit/delete, reload, reconnect, account switch and duplicate replay.
7. Verify the resulting deployment once the current Vercel build-rate limit is cleared.

## Entity policy

| Entity | Policy |
|---|---|
| Tasks | field-level merge where safe |
| Subjects | revision-based record merge |
| Progress | revision-based monotonic reconciliation |
| Exam answers | append-only events + finalization guard |
| XP | server-validated event ledger |
| Achievements | idempotent event-derived unlocks |
| Streak | server reconciliation from verified study events |
| Cortex memory | append-only/versioned evidence |
| Project evidence | append-only evidence records |
| Project metadata | revision-based record merge |

## Verification note

Code-level verification is possible through repository inspection and regression tests. Full real browser offline/online verification and production deployment verification require a runnable deployment/browser environment; the current Vercel status is blocked by a build-rate-limit failure rather than a reported application compile error.
