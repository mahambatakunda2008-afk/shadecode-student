import type { LocalMeta, LocalOperation, LocalRecord } from "./types";

const DB_NAME = "shadecode-local-first";
const DB_VERSION = 1;

const STORES = {
  records: "records",
  operations: "operations",
  meta: "meta",
} as const;

class LocalFirstDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is unavailable in this environment");
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORES.records)) {
          const store = db.createObjectStore(STORES.records, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("entity", "entity", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.operations)) {
          const store = db.createObjectStore(STORES.operations, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("lamport", "lamport", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: "key" });
        }
      };
    });
  }

  private async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
  ): Promise<T> {
    await this.init();

    return new Promise<T>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      run(store, resolve, reject);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async putRecord(record: LocalRecord): Promise<void> {
    await this.transaction<void>(STORES.records, "readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecord<T = unknown>(id: string): Promise<LocalRecord<T> | null> {
    return this.transaction<LocalRecord<T> | null>(STORES.records, "readonly", (store, resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecords(userId: string): Promise<LocalRecord[]> {
    return this.transaction<LocalRecord[]>(STORES.records, "readonly", (store, resolve, reject) => {
      const request = store.index("userId").getAll(userId);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async putOperation(operation: LocalOperation): Promise<void> {
    await this.transaction<void>(STORES.operations, "readwrite", (store, resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOperations(userId: string): Promise<LocalOperation[]> {
    return this.transaction<LocalOperation[]>(STORES.operations, "readonly", (store, resolve, reject) => {
      const request = store.index("userId").getAll(userId);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async putMeta(meta: LocalMeta): Promise<void> {
    await this.transaction<void>(STORES.meta, "readwrite", (store, resolve, reject) => {
      const request = store.put(meta);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMeta(key: string): Promise<LocalMeta | null> {
    return this.transaction<LocalMeta | null>(STORES.meta, "readonly", (store, resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearUser(userId: string): Promise<void> {
    const records = await this.getRecords(userId);
    const operations = await this.getOperations(userId);
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.records, STORES.operations], "readwrite");
      const recordStore = transaction.objectStore(STORES.records);
      const operationStore = transaction.objectStore(STORES.operations);
      records.forEach((record) => recordStore.delete(record.id));
      operations.forEach((operation) => operationStore.delete(operation.id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const localFirstDB = new LocalFirstDB();
