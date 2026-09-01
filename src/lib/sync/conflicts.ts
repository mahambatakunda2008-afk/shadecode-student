import type { SyncConflict, SyncOperation } from "./types";

/** Deterministic ordering: causal clock first, then timestamp, device and operation id. */
export function compareSyncOperations<T>(a: SyncOperation<T>, b: SyncOperation<T>): number {
  if (a.clock.lamport !== b.clock.lamport) return a.clock.lamport - b.clock.lamport;
  if (a.clock.timestamp !== b.clock.timestamp) return a.clock.timestamp - b.clock.timestamp;
  if (a.deviceId !== b.deviceId) return a.deviceId.localeCompare(b.deviceId);
  return a.operationId.localeCompare(b.operationId);
}

export function resolveSyncConflict<T>(a: SyncOperation<T>, b: SyncOperation<T>): SyncConflict<T> | null {
  if (a.scopeId !== b.scopeId || a.entity !== b.entity || a.entityId !== b.entityId) return null;
  const order = compareSyncOperations(a, b);
  if (order === 0) return null;
  const winner = order > 0 ? a : b;
  const loser = order > 0 ? b : a;
  return {
    entity: a.entity,
    entityId: a.entityId,
    winner,
    loser,
    reason: a.clock.lamport === b.clock.lamport ? "deterministic-tie-break" : "causal-order",
  };
}

export function isNewerSyncOperation<T>(candidate: SyncOperation<T>, current: SyncOperation<T>): boolean {
  return compareSyncOperations(candidate, current) > 0;
}
