import { type LocalOperation, type Tombstone, compareOperations, createTombstone } from "./operations";

const DB_NAME = "shadecode-operations";
const DB_VERSION = 1;
const OPERATIONS = "operations";
const TOMBSTONES = "tombstones";

export class LocalOperationStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OPERATIONS)) {
          const store = db.createObjectStore(OPERATIONS, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("entity", "entity", { unique: false });
          store.createIndex("entityId", "entityId", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains(TOMBSTONES)) {
          const store = db.createObjectStore(TOMBSTONES, { keyPath: "operationId" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("entity", "entity", { unique: false });
          store.createIndex("entityId", "entityId", { unique: false });
        }
      };
    });
  }

  async append(operation: LocalOperation): Promise<boolean> {
    await this.init();
    return new Promise((resolve, reject) => {
      const stores = operation.kind === "delete" ? [OPERATIONS, TOMBSTONES] : [OPERATIONS];
      const transaction = this.db!.transaction(stores, "readwrite");
      const existing = transaction.objectStore(OPERATIONS).get(operation.id);
      existing.onerror = () => reject(existing.error);
      existing.onsuccess = () => {
        if (existing.result) {
          transaction.abort();
          resolve(false);
          return;
        }
        transaction.objectStore(OPERATIONS).put(operation);
        if (operation.kind === "delete") {
          transaction.objectStore(TOMBSTONES).put(createTombstone(operation));
        }
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => {
        if (transaction.error) reject(transaction.error);
      };
    });
  }

  async remove(id: string): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([OPERATIONS], "readwrite");
      transaction.objectStore(OPERATIONS).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Operation removal aborted"));
    });
  }

  async get(id: string): Promise<LocalOperation | null> {
    await this.init();
    return this.read(OPERATIONS, id);
  }

  async list(userId: string): Promise<LocalOperation[]> {
    await this.init();
    return (await this.readAll<LocalOperation>(OPERATIONS))
      .filter((value) => value.userId === userId)
      .sort(compareOperations);
  }

  async listTombstones(userId: string): Promise<Tombstone[]> {
    await this.init();
    return (await this.readAll<Tombstone>(TOMBSTONES)).filter((value) => value.userId === userId);
  }

  private async read<T>(store: string, key: IDBValidKey): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([store], "readonly").objectStore(store).get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  private async readAll<T>(store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([store], "readonly").objectStore(store).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }
}

export const localOperationStore = new LocalOperationStore();
