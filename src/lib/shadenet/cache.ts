const DB_NAME = "shadecode-shadenet";
const DB_VERSION = 1;
const STORE = "resources";
const CACHED_AT_INDEX = "cachedAt";

interface CachedResource {
  resourceId: string;
  data: ArrayBuffer;
  sizeBytes: number;
  cachedAt: number;
}

export class ShadeNetResourceCache {
  private db: IDBDatabase | null = null;

  constructor(private readonly maxBytes = 256 * 1024 * 1024) {}

  private async init(): Promise<void> {
    if (this.db) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "resourceId" });
          store.createIndex(CACHED_AT_INDEX, "cachedAt", { unique: false });
        }
      };
    });
  }

  async get(resourceId: string): Promise<ArrayBuffer | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = store.get(resourceId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const value = request.result as CachedResource | undefined;
        if (!value) {
          resolve(null);
          return;
        }
        value.cachedAt = Date.now();
        store.put(value);
        resolve(value.data);
      };
    });
  }

  async put(resourceId: string, data: ArrayBuffer): Promise<void> {
    if (data.byteLength > this.maxBytes) throw new Error("Resource exceeds local cache limit");
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const existingRequest = store.get(resourceId);
      existingRequest.onerror = () => reject(existingRequest.error);
      existingRequest.onsuccess = () => {
        store.put({
          resourceId,
          data,
          sizeBytes: data.byteLength,
          cachedAt: Date.now(),
        } satisfies CachedResource);

        const records: CachedResource[] = [];
        const cursorRequest = store.index(CACHED_AT_INDEX).openCursor();
        cursorRequest.onerror = () => reject(cursorRequest.error);
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor) {
            records.push(cursor.value as CachedResource);
            cursor.continue();
            return;
          }

          let total = records.reduce((sum, record) => sum + record.sizeBytes, 0);
          for (const record of records) {
            if (total <= this.maxBytes) break;
            if (record.resourceId === resourceId) continue;
            store.delete(record.resourceId);
            total -= record.sizeBytes;
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
      };
    });
  }

  async remove(resourceId: string): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).delete(resourceId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const shadeNetCache = new ShadeNetResourceCache();
