import type { ShadeNetResource } from "./content";
import type { ShadeNetResearchRecord } from "./research-memory";

const DB_NAME = "shadecode-shadenet";
const DB_VERSION = 3;
const STORE = "resources";
const RESEARCH_STORE = "research";

export class ShadeNetStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("ShadeNet local storage is unavailable in this environment.");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => { this.db?.close(); this.db = null; };
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(STORE)) {
          const existing = request.transaction!.objectStore(STORE);
          // A previous release used this name for binary cache entries with a
          // different keyPath. Preserve those records during the schema repair
          // instead of deleting user data that may still be useful for recovery.
          if (existing.keyPath !== "contentHash") {
            // Never discard an incompatible store merely because a previous
            // legacy archive already exists. Pick a fresh archive name so every
            // upgrade preserves the records it is about to replace.
            let legacyName = "legacy_resources_v1";
            let suffix = 2;
            while (db.objectStoreNames.contains(legacyName)) {
              legacyName = `legacy_resources_v${suffix++}`;
            }
            const legacy = db.createObjectStore(legacyName, { autoIncrement: true });
            const cursorRequest = existing.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (cursor) {
                legacy.put(cursor.value);
                cursor.continue();
                return;
              }
              // Delete only after the cursor has copied every record. Both
              // operations remain inside the versionchange transaction.
              db.deleteObjectStore(STORE);
              const resources = db.createObjectStore(STORE, { keyPath: "contentHash" });
              resources.createIndex("type", "metadata.type", { unique: false });
              resources.createIndex("subject", "metadata.subject", { unique: false });
            };
          }
        }
        if (!db.objectStoreNames.contains(STORE)) {
          const resources = db.createObjectStore(STORE, { keyPath: "contentHash" });
          resources.createIndex("type", "metadata.type", { unique: false });
          resources.createIndex("subject", "metadata.subject", { unique: false });
        }
        if (!db.objectStoreNames.contains(RESEARCH_STORE)) {
          const research = db.createObjectStore(RESEARCH_STORE, { keyPath: "id" });
          research.createIndex("subject", "curriculum.subject", { unique: false });
          research.createIndex("savedAt", "savedAt", { unique: false });
          research.createIndex("lastUsedAt", "lastUsedAt", { unique: false });
        }
      };
    });
  }

  async put<T>(resource: ShadeNetResource<T>): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readwrite").objectStore(STORE).put(resource);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(hash: string): Promise<ShadeNetResource<T> | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readonly").objectStore(STORE).get(hash);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async has(hash: string): Promise<boolean> {
    return (await this.get(hash)) !== null;
  }

  async list(): Promise<ShadeNetResource[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([STORE], "readonly").objectStore(STORE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async saveResearch(record: ShadeNetResearchRecord): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE, RESEARCH_STORE], "readwrite");
      transaction.objectStore(STORE).put(record.resource);
      transaction.objectStore(RESEARCH_STORE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Research memory save was cancelled."));
    });
  }

  async getResearch(id: string): Promise<ShadeNetResearchRecord | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([RESEARCH_STORE], "readonly").objectStore(RESEARCH_STORE).get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async listResearch(): Promise<ShadeNetResearchRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([RESEARCH_STORE], "readonly").objectStore(RESEARCH_STORE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteResearch(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction([RESEARCH_STORE], "readwrite").objectStore(RESEARCH_STORE).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async markResearchUsed(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESEARCH_STORE], "readwrite");
      const store = transaction.objectStore(RESEARCH_STORE);
      const request = store.get(id);
      request.onsuccess = () => {
        const record = request.result as ShadeNetResearchRecord | undefined;
        if (record) store.put({ ...record, useCount: record.useCount + 1, lastUsedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Research memory usage update was cancelled."));
    });
  }
}

export const shadeNetStore = new ShadeNetStore();
