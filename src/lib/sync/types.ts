/**
 * Local-first synchronization contracts.
 *
 * These types deliberately contain no Supabase-specific fields. The same
 * envelope can later travel over a personal-device or ShadeNet transport.
 */

export type SyncEntity =
  | 'task'
  | 'subject'
  | 'timetable'
  | 'achievement'
  | 'learning_event'
  | 'cortex_insight'
  | 'resource'
  | 'setting'
  | 'custom';

export type SyncOperationKind = 'create' | 'update' | 'delete';

export interface SyncClock {
  /** Lamport clock used for deterministic causal ordering. */
  lamport: number;
  /** Wall-clock timestamp is metadata only and must not define correctness. */
  timestamp: number;
}

export interface SyncOperation<T = unknown> {
  /** Globally unique operation identifier. */
  operationId: string;
  /** Stable identifier for the originating installation/device. */
  deviceId: string;
  /** Authenticated owner/scope. Never infer this from a peer-supplied value. */
  scopeId: string;
  entity: SyncEntity;
  entityId: string;
  kind: SyncOperationKind;
  payload?: T;
  clock: SyncClock;
  /** Optional ID of the operation this operation supersedes. */
  supersedes?: string;
  /** Deletion marker retained until reconciliation has safely observed it. */
  tombstone?: boolean;
  /** Schema version for forward-compatible migrations. */
  schemaVersion: 1;
}

export interface SyncTombstone {
  entity: SyncEntity;
  entityId: string;
  operationId: string;
  deviceId: string;
  scopeId: string;
  clock: SyncClock;
  schemaVersion: 1;
}

export interface SyncConflict<T = unknown> {
  entity: SyncEntity;
  entityId: string;
  winner: SyncOperation<T>;
  loser: SyncOperation<T>;
  reason: 'causal-order' | 'deterministic-tie-break';
}

export interface SyncCursor {
  scopeId: string;
  deviceId: string;
  lamport: number;
}

export interface SyncStore {
  append<T>(operation: SyncOperation<T>): Promise<void>;
  getPending(scopeId: string): Promise<SyncOperation[]>;
  markAcknowledged(operationIds: string[]): Promise<void>;
  putTombstone(tombstone: SyncTombstone): Promise<void>;
  getTombstones(scopeId: string): Promise<SyncTombstone[]>;
  getCursor(scopeId: string): Promise<SyncCursor | undefined>;
  setCursor(cursor: SyncCursor): Promise<void>;
}
