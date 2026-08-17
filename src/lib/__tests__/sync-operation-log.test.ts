import { describe, expect, it } from 'vitest';
import {
  createOperation,
  makeTombstone,
  nextClock,
  operationWins,
  orderOperations,
} from '../sync/operation-log';
import type { SyncOperation } from '../sync/types';

describe('local-first sync operation log', () => {
  it('increments a Lamport clock without relying on wall-clock ordering', () => {
    expect(nextClock({ lamport: 7, timestamp: 100 }).lamport).toBe(8);
    expect(nextClock(undefined).lamport).toBe(1);
  });

  it('creates deletes as durable tombstone operations', () => {
    const operation = createOperation({
      scopeId: 'user-1',
      entity: 'task',
      entityId: 'task-1',
      kind: 'delete',
    });

    expect(operation.kind).toBe('delete');
    expect(operation.tombstone).toBe(true);
    expect(operation.schemaVersion).toBe(1);
    expect(operation.operationId).toBeTruthy();
    expect(operation.deviceId).toBeTruthy();
  });

  it('uses deterministic tie-breaking for concurrent operations', () => {
    const base = {
      scopeId: 'user-1',
      entity: 'task' as const,
      entityId: 'task-1',
      kind: 'update' as const,
      clock: { lamport: 3, timestamp: 1000 },
      schemaVersion: 1 as const,
    };

    const a: SyncOperation = { ...base, operationId: 'a', deviceId: 'device-a' };
    const b: SyncOperation = { ...base, operationId: 'b', deviceId: 'device-b' };

    expect(operationWins(a, b).operationId).toBe('b');
    expect(orderOperations([b, a]).map((item) => item.operationId)).toEqual(['a', 'b']);
  });

  it('orders causally newer operations after older operations', () => {
    const older: SyncOperation = {
      operationId: 'old',
      deviceId: 'device-a',
      scopeId: 'user-1',
      entity: 'task',
      entityId: 'task-1',
      kind: 'update',
      clock: { lamport: 4, timestamp: 9000 },
      schemaVersion: 1,
    };
    const newer: SyncOperation = {
      ...older,
      operationId: 'new',
      clock: { lamport: 5, timestamp: 1 },
    };

    expect(orderOperations([newer, older]).map((item) => item.operationId)).toEqual(['old', 'new']);
  });

  it('converts a delete operation into a replayable tombstone', () => {
    const operation = createOperation({
      scopeId: 'user-1',
      entity: 'task',
      entityId: 'task-1',
      kind: 'delete',
    });
    const tombstone = makeTombstone(operation);

    expect(tombstone).toMatchObject({
      entity: 'task',
      entityId: 'task-1',
      operationId: operation.operationId,
      scopeId: 'user-1',
      schemaVersion: 1,
    });
  });
});
