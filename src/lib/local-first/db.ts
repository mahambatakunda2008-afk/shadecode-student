import type { LocalMeta, LocalOperation, LocalRecord } from "./types";
import { createOperationId } from "./operations";

const DB_NAME = "shadecode-local-first";
const DB_VERSION = 2;
const STORES = { records: "records", operations: "operations", meta: "meta" } as const;
const LAMPORT_KEY = "lamport";
const DEVICE_ID_KEY = "deviceId";
const SEQUENCE_PREFIX = "sequence:";

class LocalFirstDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable in this environment");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; this.db.onversionchange = () => { this.db?.close(); this.db = null; }; resolve(); };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        if (!db.objectStoreNames.contains(STORES.records)) {
          const store = db.createObjectStore(STORES.records, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false }); store.createIndex("entity", "entity", { unique: false }); store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.operations)) {
          const store = db.createObjectStore(STORES.operations, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false }); store.createIndex("lamport", "lamport", { unique: false }); store.createIndex("timestamp", "timestamp", { unique: false }); store.createIndex("deviceId", "deviceId", { unique: false }); store.createIndex("sequence", "sequence", { unique: false });
        } else if (oldVersion < 2) {
          const store = request.transaction!.objectStore(STORES.operations);
          if (!store.indexNames.contains("deviceId")) store.createIndex("deviceId", "deviceId", { unique: false });
          if (!store.indexNames.contains("sequence")) store.createIndex("sequence", "sequence", { unique: false });
          const perDevice = new Map<string, number>(); const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result; if (!cursor) return;
            const old = cursor.value as Record<string, unknown>;
            if (old.kind === undefined && typeof old.type === "string") {
              const deviceId = typeof old.deviceId === "string" ? old.deviceId : "legacy"; const sequence = (perDevice.get(deviceId) ?? 0) + 1; perDevice.set(deviceId, sequence);
              cursor.delete(); store.put({ id: createOperationId(deviceId, sequence), deviceId, userId: String(old.userId ?? ""), entity: String(old.entity ?? "study_state"), entityId: String(old.recordId ?? ""), recordId: String(old.recordId ?? ""), kind: old.type === "delete" ? "delete" : "update", payload: old.payload, timestamp: new Date(Number(old.timestamp ?? Date.now())).toISOString(), sequence, lamport: Number(old.lamport ?? sequence) });
            }
            cursor.continue();
          };
        }
        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
      };
    });
  }

  private async transaction<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> {
    await this.init();
    return new Promise<T>((resolve, reject) => { const transaction = this.db!.transaction(storeName, mode); const store = transaction.objectStore(storeName); run(store, resolve, reject); transaction.onerror = () => reject(transaction.error); });
  }

  async getOrCreateDeviceId(createId: () => string): Promise<string> {
    await this.init();
    return new Promise<string>((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.meta, "readwrite"); const store = transaction.objectStore(STORES.meta); const request = store.get(DEVICE_ID_KEY); let deviceId: string | null = null;
      request.onsuccess = () => { const value = request.result?.value; if (typeof value === "string" && value) { deviceId = value; return; } deviceId = createId(); store.put({ key: DEVICE_ID_KEY, value: deviceId }); };
      request.onerror = () => reject(request.error); transaction.oncomplete = () => resolve(deviceId!); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error("Device identity transaction aborted"));
    });
  }

  async putRecord(record: LocalRecord): Promise<void> { await this.transaction<void>(STORES.records, "readwrite", (store, resolve, reject) => { const request = store.put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }

  async mutateRecord<T>(input: { id: string; entity: LocalRecord["entity"]; entityId?: string; userId: string; payload: T; deviceId: string; deletedAt?: number }): Promise<LocalRecord<T>> {
    if (!input.userId) throw new Error("Local mutation requires an authenticated user");
    await this.init();
    return new Promise<LocalRecord<T>>((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.records, STORES.operations, STORES.meta], "readwrite"); const records = transaction.objectStore(STORES.records); const operations = transaction.objectStore(STORES.operations); const meta = transaction.objectStore(STORES.meta);
      const existingRequest = records.get(input.id); const sequenceKey = `${SEQUENCE_PREFIX}${input.deviceId}`; let existing: LocalRecord | undefined; let sequence = 0; let lamport = 0; let result: LocalRecord<T> | undefined; let settled = false;
      const fail = (error: unknown) => { if (!settled) { settled = true; reject(error); } try { transaction.abort(); } catch {} };
      existingRequest.onsuccess = () => {
        existing = existingRequest.result as LocalRecord | undefined;
        if (existing && existing.userId !== input.userId) return fail(new Error("Refusing to mutate a record owned by another user"));
        const lamportRequest = meta.get(LAMPORT_KEY); const sequenceRequest = meta.get(sequenceKey); let ready = 0;
        const finishClock = () => {
          ready += 1; if (ready !== 2) return; lamport += 1; sequence += 1; const now = Date.now();
          result = { id: input.id, entity: input.entity, userId: input.userId, payload: input.payload, updatedAt: now, deviceId: input.deviceId, version: lamport, ...(input.deletedAt === undefined ? {} : { deletedAt: input.deletedAt }) };
          const operation: LocalOperation<T> = { id: createOperationId(input.deviceId, sequence), recordId: input.id, entity: input.entity, entityId: input.entityId ?? input.id, userId: input.userId, deviceId: input.deviceId, kind: input.deletedAt === undefined ? (existing && !existing.deletedAt ? "update" : "create") : "delete", ...(input.deletedAt === undefined ? { payload: input.payload } : {}), timestamp: new Date(now).toISOString(), sequence, lamport };
          records.put(result); operations.put(operation); meta.put({ key: LAMPORT_KEY, value: lamport }); meta.put({ key: sequenceKey, value: sequence });
        };
        lamportRequest.onsuccess = () => { lamport = typeof lamportRequest.result?.value === "number" ? lamportRequest.result.value : 0; finishClock(); };
        sequenceRequest.onsuccess = () => { sequence = typeof sequenceRequest.result?.value === "number" ? sequenceRequest.result.value : 0; finishClock(); };
        lamportRequest.onerror = () => fail(lamportRequest.error); sequenceRequest.onerror = () => fail(sequenceRequest.error);
      };
      existingRequest.onerror = () => fail(existingRequest.error);
      transaction.oncomplete = () => { if (!settled) { if (result) { settled = true; resolve(result); } else { settled = true; reject(new Error("Local mutation completed without a result")); } } };
      transaction.onerror = () => { if (!settled) { settled = true; reject(transaction.error ?? new Error("Local mutation failed")); } };
      transaction.onabort = () => { if (!settled) { settled = true; reject(transaction.error ?? new Error("Local mutation aborted")); } };
    });
  }

  async putRecordAndOperation(record: LocalRecord, operation: LocalOperation): Promise<void> { await this.init(); await new Promise<void>((resolve, reject) => { const transaction = this.db!.transaction([STORES.records, STORES.operations], "readwrite"); transaction.objectStore(STORES.records).put(record); transaction.objectStore(STORES.operations).put(operation); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error("Local mutation aborted")); }); }
  async getRecord<T = unknown>(id: string): Promise<LocalRecord<T> | null> { return this.transaction<LocalRecord<T> | null>(STORES.records, "readonly", (store, resolve, reject) => { const request = store.get(id); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); }
  async getRecords(userId: string): Promise<LocalRecord[]> { return this.transaction<LocalRecord[]>(STORES.records, "readonly", (store, resolve, reject) => { const request = store.index("userId").getAll(userId); request.onsuccess = () => resolve(request.result ?? []); request.onerror = () => reject(request.error); }); }
  async putOperation(operation: LocalOperation): Promise<void> { await this.transaction<void>(STORES.operations, "readwrite", (store, resolve, reject) => { const request = store.put(operation); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
  async getOperations(userId: string): Promise<LocalOperation[]> { return this.transaction<LocalOperation[]>(STORES.operations, "readonly", (store, resolve, reject) => { const request = store.index("userId").getAll(userId); request.onsuccess = () => resolve((request.result ?? []).filter((operation) => operation?.kind)); request.onerror = () => reject(request.error); }); }
  async getPendingOperations(userId: string): Promise<LocalOperation[]> { return (await this.getOperations(userId)).filter((operation) => !operation.syncedAt); }
  async markOperationSynced(id: string, syncedAt = new Date().toISOString()): Promise<void> { await this.init(); await new Promise<void>((resolve, reject) => { const transaction = this.db!.transaction(STORES.operations, "readwrite"); const store = transaction.objectStore(STORES.operations); const request = store.get(id); request.onsuccess = () => { const operation = request.result as LocalOperation | undefined; if (operation) store.put({ ...operation, syncedAt }); }; request.onerror = () => reject(request.error); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); }
  async nextClock(deviceId: string, remoteLamport = 0): Promise<{ sequence: number; lamport: number }> { await this.init(); return new Promise((resolve, reject) => { const transaction = this.db!.transaction(STORES.meta, "readwrite"); const store = transaction.objectStore(STORES.meta); const lamportRequest = store.get(LAMPORT_KEY); const sequenceKey = `${SEQUENCE_PREFIX}${deviceId}`; const sequenceRequest = store.get(sequenceKey); let lamport = 0; let sequence = 0; let ready = 0; const finish = () => { ready += 1; if (ready !== 2) return; lamport = Math.max(lamport, remoteLamport) + 1; sequence += 1; store.put({ key: LAMPORT_KEY, value: lamport }); store.put({ key: sequenceKey, value: sequence }); }; lamportRequest.onsuccess = () => { lamport = typeof lamportRequest.result?.value === "number" ? lamportRequest.result.value : 0; finish(); }; sequenceRequest.onsuccess = () => { sequence = typeof sequenceRequest.result?.value === "number" ? sequenceRequest.result.value : 0; finish(); }; lamportRequest.onerror = () => reject(lamportRequest.error); sequenceRequest.onerror = () => reject(sequenceRequest.error); transaction.oncomplete = () => resolve({ sequence, lamport }); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error("Clock transaction aborted")); }); }
  async putMeta(meta: LocalMeta): Promise<void> { await this.transaction<void>(STORES.meta, "readwrite", (store, resolve, reject) => { const request = store.put(meta); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
  async getMeta(key: string): Promise<LocalMeta | null> { return this.transaction<LocalMeta | null>(STORES.meta, "readonly", (store, resolve, reject) => { const request = store.get(key); request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); }
  async clearUser(userId: string): Promise<void> { const records = await this.getRecords(userId); const operations = await this.getOperations(userId); await this.init(); await new Promise<void>((resolve, reject) => { const transaction = this.db!.transaction([STORES.records, STORES.operations], "readwrite"); const recordStore = transaction.objectStore(STORES.records); const operationStore = transaction.objectStore(STORES.operations); records.forEach((record) => recordStore.delete(record.id)); operations.forEach((operation) => operationStore.delete(operation.id)); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); }
}

export const localFirstDB = new LocalFirstDB();
