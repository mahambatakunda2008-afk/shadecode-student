export type LocalOperationKind = "create" | "update" | "delete";

export interface LocalOperation<T = unknown> {
  id: string;
  deviceId: string;
  userId: string;
  entity: string;
  entityId: string;
  kind: LocalOperationKind;
  payload?: T;
  timestamp: string;
  sequence: number;
}

export interface Tombstone {
  entity: string;
  entityId: string;
  userId: string;
  operationId: string;
  deviceId: string;
  timestamp: string;
  sequence: number;
}

export function createOperationId(deviceId: string, sequence: number): string {
  if (!deviceId || !Number.isSafeInteger(sequence) || sequence < 0) throw new Error("Invalid operation identity");
  return `${deviceId}:${sequence}`;
}

export function compareOperations(a: LocalOperation, b: LocalOperation): number {
  if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.id.localeCompare(b.id);
}

export function createTombstone(operation: LocalOperation): Tombstone {
  if (operation.kind !== "delete") throw new Error("Tombstones require delete operations");
  return { entity: operation.entity, entityId: operation.entityId, userId: operation.userId, operationId: operation.id, deviceId: operation.deviceId, timestamp: operation.timestamp, sequence: operation.sequence };
}

export function isOperationSuppressed(operation: LocalOperation, tombstones: Tombstone[]): boolean {
  return tombstones.some((tombstone) => {
    if (tombstone.userId !== operation.userId || tombstone.entity !== operation.entity || tombstone.entityId !== operation.entityId) return false;
    return compareOperations(operation, { id: tombstone.operationId, deviceId: tombstone.deviceId, userId: tombstone.userId, entity: tombstone.entity, entityId: tombstone.entityId, kind: "delete", timestamp: tombstone.timestamp, sequence: tombstone.sequence }) <= 0;
  });
}
