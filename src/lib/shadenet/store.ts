import type { ShadeNetResource } from "./content";

const DB_NAME = "shadecode-shadenet";
const DB_VERSION = 1;
const STORE = "resources";

export class ShadeNetStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "contentHash" });
          store.createIndex("type", "metadata.type", { unique: false });
          store.createIndex("subject", "metadata.subject", { unique: false });
          store.createIndex("createdAt", "metadata.createdAt", { unique: false });
        }
      };
    });
  }

  async put<T>(resource: ShadeNetResource<T>): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readwrite").objectStore(STORE).put(resource);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(contentHash: string): Promise<ShadeNetResource<T> | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readonly").objectStore(STORE).get(contentHash);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async has(contentHash: string): Promise<boolean> {
    return (await this.get(contentHash)) !== null;
  }

  async list(): Promise<ShadeNetResource[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readonly").objectStore(STORE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }
}

export const shadeNetStore = new ShadeNetStore();
