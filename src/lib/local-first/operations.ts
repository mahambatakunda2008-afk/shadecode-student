import type { LocalEntity } from "./types";

export type LocalOperationKind = "create" | "update" | "delete";

/** Canonical local event. Every device mutation uses this shape. */
export interface LocalOperation<T = unknown> {
  id: string;
  deviceId: string;
  userId: string;
  entity: LocalEntity;
  /** Stable entity key used by sync and replay. */
  entityId: string;
  /** Backwards-compatible alias for the local record key. */
  recordId?: string;
  kind: LocalOperationKind;
  payload?: T;
  timestamp: string;
  sequence: number;
  lamport: number;
}

export interface Tombstone {
  entity: LocalEntity;
  entityId: string;
  userId: string;
  operationId: string;
  deviceId: string;
  timestamp: string;
  sequence: number;
  lamport: number;
}

export function createOperationId(deviceId: string, sequence: number): string {
  if (!deviceId || !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Invalid operation identity");
  }
  return `${deviceId}:${sequence}`;
}

export function compareOperations(a: LocalOperation, b: LocalOperation): number {
  if (a.lamport !== b.lamport) return a.lamport - b.lamport;
  if (a.timestamp !== b.timestamp) return a.timestamp.localeCompare(b.timestamp);
  if (a.deviceId !== b.deviceId) return a.deviceId.localeCompare(b.deviceId);
  return a.sequence - b.sequence;
}

export function createTombstone(operation: LocalOperation): Tombstone {
  if (operation.kind !== "delete") throw new Error("Tombstones require delete operations");
  return {
    entity: operation.entity,
    entityId: operation.entityId,
    userId: operation.userId,
    operationId: operation.id,
    deviceId: operation.deviceId,
    timestamp: operation.timestamp,
    sequence: operation.sequence,
    lamport: operation.lamport,
  };
}

export function isOperationSuppressed(operation: LocalOperation, tombstones: Tombstone[]): boolean {
  return tombstones.some(
    (tombstone) =>
      tombstone.userId === operation.userId &&
      tombstone.entity === operation.entity &&
      tombstone.entityId === operation.entityId &&
      tombstone.lamport >= operation.lamport,
  );
}
