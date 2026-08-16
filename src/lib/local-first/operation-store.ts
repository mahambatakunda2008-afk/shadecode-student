import {
  type LocalOperation,
  type Tombstone,
  compareOperations,
  createTombstone,
} from "./operations";

const DB_NAME = "shadecode-offline";
const DB_VERSION = 3;
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
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
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
    const existing = await this.get(operation.id);
    if (existing) return false;
    await this.put(OPERATIONS, operation);
    if (operation.kind === "delete") {
      await this.put(TOMBSTONES, createTombstone(operation));
    }
    return true;
  }

  async get(id: string): Promise<LocalOperation | null> {
    await this.init();
    return this.read<LocalOperation>(OPERATIONS, id);
  }

  async list(userId: string): Promise<LocalOperation[]> {
    await this.init();
    const operations = await this.readAll<LocalOperation>(OPERATIONS);
    return operations.filter((operation) => operation.userId === userId).sort(compareOperations);
  }

  async listTombstones(userId: string): Promise<Tombstone[]> {
    await this.init();
    const tombstones = await this.readAll<Tombstone>(TOMBSTONES);
    return tombstones.filter((tombstone) => tombstone.userId === userId);
  }

  async hasOperation(id: string): Promise<boolean> {
    return (await this.get(id)) !== null;
  }

  private async put(storeName: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).put(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async read<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  private async readAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }
}

export const localOperationStore = new LocalOperationStore();
