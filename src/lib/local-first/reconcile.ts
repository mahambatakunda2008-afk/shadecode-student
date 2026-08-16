import { compareOperations, type LocalOperation, type Tombstone } from "./operations";

export interface ReconcileResult<T> {
  value: T | null;
  winningOperation: LocalOperation | null;
  deleted: boolean;
}

/**
 * Deterministically selects the latest operation for one entity. This is a
 * pure function so the same operation set produces the same result on every
 * device and can later be reused by P2P peers.
 */
export function reconcileEntity<T>(
  operations: LocalOperation<T>[],
  tombstones: Tombstone[],
): ReconcileResult<T> {
  if (operations.length === 0) return { value: null, winningOperation: null, deleted: false };

  const relevant = operations
    .filter((operation) =>
      tombstones.every(
        (tombstone) =>
          tombstone.entity !== operations[0].entity ||
          tombstone.entityId !== operations[0].entityId ||
          tombstone.userId !== operations[0].userId ||
          compareOperations(operation, tombstoneToOperation(tombstone)) > 0,
      ),
    )
    .sort(compareOperations);

  const winningOperation = relevant[relevant.length - 1] ?? null;
  if (!winningOperation || winningOperation.kind === "delete") {
    return { value: null, winningOperation, deleted: true };
  }

  const value = relevant
    .filter((operation) => operation.kind !== "delete")
    .reduce((current, operation) => ({ ...(current ?? {}), ...(operation.payload as object) }), null as T | null);

  return { value, winningOperation, deleted: false };
}

function tombstoneToOperation(tombstone: Tombstone): LocalOperation {
  return {
    id: tombstone.operationId,
    deviceId: tombstone.deviceId,
    userId: tombstone.userId,
    entity: tombstone.entity,
    entityId: tombstone.entityId,
    kind: "delete",
    timestamp: tombstone.timestamp,
    sequence: tombstone.sequence,
  };
}
