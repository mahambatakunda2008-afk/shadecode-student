/** Local-first synchronization contracts. */
export type SyncEntity = 'task' | 'subject' | 'timetable' | 'achievement' | 'learning_event' | 'cortex_insight' | 'resource' | 'setting' | 'custom';
export type SyncOperationKind = 'create' | 'update' | 'delete';
export interface SyncClock { lamport: number; timestamp: number; }
export interface SyncOperation<T = unknown> { operationId: string; deviceId: string; scopeId: string; entity: SyncEntity; entityId: string; kind: SyncOperationKind; payload?: T; clock: SyncClock; supersedes?: string; tombstone?: boolean; schemaVersion: 1; }
export interface SyncTombstone { entity: SyncEntity; entityId: string; operationId: string; deviceId: string; scopeId: string; clock: SyncClock; schemaVersion: 1; }
export interface SyncConflict<T = unknown> { entity: SyncEntity; entityId: string; winner: SyncOperation<T>; loser: SyncOperation<T>; reason: 'causal-order' | 'deterministic-tie-break'; detectedAt: number; }
export interface SyncCursor { scopeId: string; deviceId: string; lamport: number; }
export interface SyncStore { append<T>(operation: SyncOperation<T>): Promise<void>; getPending(scopeId: string): Promise<SyncOperation[]>; markAcknowledged(operationIds: string[]): Promise<void>; putTombstone(tombstone: SyncTombstone): Promise<void>; getTombstones(scopeId: string): Promise<SyncTombstone[]>; getCursor(scopeId: string): Promise<SyncCursor | undefined>; setCursor(cursor: SyncCursor): Promise<void>; }