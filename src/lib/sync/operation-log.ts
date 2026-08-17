import type {
  SyncClock,
  SyncCursor,
  SyncEntity,
  SyncOperation,
  SyncOperationKind,
  SyncStore,
  SyncTombstone,
} from './types';

const DB_NAME = 'shadecode-local-first';
const DB_VERSION = 1;
const OPERATIONS_STORE = 'operations';
const TOMBSTONES_STORE = 'tombstones';
const CURSORS_STORE = 'cursors';
const DEVICE_ID_KEY = 'shadecode.device-id';

const hasIndexedDB = () => typeof indexedDB !== 'undefined';
let volatileDeviceId: string | undefined;

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns a stable installation identifier in a browser.
 * Non-browser runtimes use a process-local identifier so pure operation-log
 * logic remains testable without pretending a server has a persistent device.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    volatileDeviceId ??= uuid();
    return volatileDeviceId;
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = uuid();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    volatileDeviceId ??= uuid();
    return volatileDeviceId;
  }
}

function compareOperations(a: SyncOperation, b: SyncOperation): number {
  if (a.clock.lamport !== b.clock.lamport) {
    return a.clock.lamport - b.clock.lamport;
  }
  if (a.clock.timestamp !== b.clock.timestamp) {
    return a.clock.timestamp - b.clock.timestamp;
  }
  const deviceOrder = a.deviceId.localeCompare(b.deviceId);
  if (deviceOrder !== 0) return deviceOrder;
  return a.operationId.localeCompare(b.operationId);
}

export function nextClock(current: SyncClock | undefined): SyncClock {
  return {
    lamport: (current?.lamport ?? 0) + 1,
    timestamp: Date.now(),
  };
}

export function createOperation<T>(input: {
  scopeId: string;
  entity: SyncEntity;
  entityId: string;
  kind: SyncOperationKind;
  payload?: T;
  previousClock?: SyncClock;
  supersedes?: string;
}): SyncOperation<T> {
  const deviceId = getDeviceId();
  return {
    operationId: uuid(),
    deviceId,
    scopeId: input.scopeId,
    entity: input.entity,
    entityId: input.entityId,
    kind: input.kind,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    clock: nextClock(input.previousClock),
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    ...(input.kind === 'delete' ? { tombstone: true } : {}),
    schemaVersion: 1,
  };
}

export function operationWins(a: SyncOperation, b: SyncOperation): SyncOperation {
  return compareOperations(a, b) >= 0 ? a : b;
}

export function orderOperations(operations: SyncOperation[]): SyncOperation[] {
  return [...operations].sort(compareOperations);
}

export function makeTombstone(operation: SyncOperation): SyncTombstone {
  return {
    entity: operation.entity,
    entityId: operation.entityId,
    operationId: operation.operationId,
    deviceId: operation.deviceId,
    scopeId: operation.scopeId,
    clock: operation.clock,
    schemaVersion: 1,
  };
}

class IndexedDbSyncStore implements SyncStore {
  private dbPromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OPERATIONS_STORE)) {
          const operations = db.createObjectStore(OPERATIONS_STORE, { keyPath: 'operationId' });
          operations.createIndex('scopeId', 'scopeId', { unique: false });
          operations.createIndex('acknowledged', 'acknowledged', { unique: false });
        }
        if (!db.objectStoreNames.contains(TOMBSTONES_STORE)) {
          const tombstones = db.createObjectStore(TOMBSTONES_STORE, { keyPath: 'operationId' });
          tombstones.createIndex('scopeId', 'scopeId', { unique: false });
        }
        if (!db.objectStoreNames.contains(CURSORS_STORE)) {
          db.createObjectStore(CURSORS_STORE, { keyPath: 'scopeId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open local sync database'));
    });
    return this.dbPromise;
  }

  async append<T>(operation: SyncOperation<T>): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const stores = operation.kind === 'delete' ? [OPERATIONS_STORE, TOMBSTONES_STORE] : [OPERATIONS_STORE];
      const tx = db.transaction(stores, 'readwrite');
      tx.objectStore(OPERATIONS_STORE).put({ ...operation, acknowledged: false });
      if (operation.kind === 'delete') tx.objectStore(TOMBSTONES_STORE).put(makeTombstone(operation));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Unable to append sync operation'));
      tx.onabort = () => reject(tx.error ?? new Error('Sync operation transaction aborted'));
    });
  }

  async getPending(scopeId: string): Promise<SyncOperation[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OPERATIONS_STORE, 'readonly');
      const request = tx.objectStore(OPERATIONS_STORE).index('scopeId').getAll(scopeId);
      request.onsuccess = () => {
        const pending = (request.result as Array<SyncOperation & { acknowledged: boolean }>)
          .filter((item) => !item.acknowledged)
          .map(({ acknowledged: _acknowledged, ...operation }) => operation);
        resolve(orderOperations(pending));
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to read pending operations'));
    });
  }

  async markAcknowledged(operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OPERATIONS_STORE, 'readwrite');
      const store = tx.objectStore(OPERATIONS_STORE);
      for (const id of operationIds) {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) store.put({ ...request.result, acknowledged: true });
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Unable to acknowledge sync operations'));
      tx.onabort = () => reject(tx.error ?? new Error('Acknowledgement transaction aborted'));
    });
  }

  async putTombstone(tombstone: SyncTombstone): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TOMBSTONES_STORE, 'readwrite');
      tx.objectStore(TOMBSTONES_STORE).put(tombstone);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Unable to persist tombstone'));
      tx.onabort = () => reject(tx.error ?? new Error('Tombstone transaction aborted'));
    });
  }

  async getTombstones(scopeId: string): Promise<SyncTombstone[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(TOMBSTONES_STORE, 'readonly').objectStore(TOMBSTONES_STORE).index('scopeId').getAll(scopeId);
      request.onsuccess = () => resolve(request.result as SyncTombstone[]);
      request.onerror = () => reject(request.error ?? new Error('Unable to read tombstones'));
    });
  }

  async getCursor(scopeId: string): Promise<SyncCursor | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(CURSORS_STORE, 'readonly').objectStore(CURSORS_STORE).get(scopeId);
      request.onsuccess = () => resolve(request.result as SyncCursor | undefined);
      request.onerror = () => reject(request.error ?? new Error('Unable to read sync cursor'));
    });
  }

  async setCursor(cursor: SyncCursor): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CURSORS_STORE, 'readwrite');
      tx.objectStore(CURSORS_STORE).put(cursor);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Unable to persist sync cursor'));
      tx.onabort = () => reject(tx.error ?? new Error('Cursor transaction aborted'));
    });
  }
}

export function createSyncStore(): SyncStore {
  if (!hasIndexedDB()) throw new Error('Local-first sync storage is only available in a browser context');
  return new IndexedDbSyncStore();
}
