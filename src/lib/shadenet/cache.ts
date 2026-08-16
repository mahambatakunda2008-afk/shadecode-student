const DB_NAME = "shadecode-shadenet";
const DB_VERSION = 1;
const STORE = "resources";

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
          store.createIndex("cachedAt", "cachedAt", { unique: false });
        }
      };
    });
  }

  async get(resourceId: string): Promise<ArrayBuffer | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get(resourceId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data ?? null);
    });
  }

  async put(resourceId: string, data: ArrayBuffer): Promise<void> {
    if (data.byteLength > this.maxBytes) throw new Error("Resource exceeds local cache limit");
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).put({
        resourceId,
        data,
        sizeBytes: data.byteLength,
        cachedAt: Date.now(),
      } satisfies CachedResource);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
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
