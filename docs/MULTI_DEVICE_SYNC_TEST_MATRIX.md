# Multi-device sync verification matrix

## Deterministic local policy

| Scenario | Expected result |
|---|---|
| Same Lamport, different devices | Same winner on every device |
| Winning delete vs older update | Update remains suppressed by tombstone |
| Newer update after delete | Update is eligible to apply |
| Same operation delivered twice | Same operation identity, no second logical mutation |

## Server OCC scenarios

1. Device A reads revision `N` and writes with `baseVersion=N` -> accepted as `N+1`.
2. Device B still has `baseVersion=N` and writes -> `409 conflict`.
3. Device B reconciles against the server winner and persists `LocalConflict`.
4. Retrying the stale mutation must not overwrite the winner.
5. A delete must participate in the same revision protocol as an update.
6. Reconnecting after offline work must drain the queue without creating duplicate logical records.

## Browser / production verification

- Start with one account and one task.
- Open two authenticated browser contexts representing two devices.
- Mutate the same task independently while disconnected.
- Reconnect device A, then device B.
- Verify exactly one server winner.
- Verify device B records the losing operation as a conflict.
- Refresh both devices and verify convergence.
- Repeat with delete vs update.
- Repeat with duplicate delivery/retry.
- Inspect browser console for uncaught sync errors.

## Exit criteria

The sync system is considered production-ready for this phase only when all deterministic unit tests pass and the browser scenario demonstrates convergence after concurrent writes, deletes, reconnects, and duplicate delivery.
