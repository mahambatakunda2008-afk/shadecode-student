import type { ResourceChunk } from "./protocol";

export interface PersistedTransferChunk {
  index: number;
  total: number;
  data: ArrayBuffer;
  sha256: string;
  savedAt: number;
}

interface StoredChunk extends PersistedTransferChunk {
  key: string;
  transferKey: string;
}

const DB_NAME = "shadecode-shadenet-transfers";
const DB_VERSION = 1;
const STORE = "chunks";

function transferKey(resourceId: string, expectedSha256: string): string {
  return `${resourceId}:${expectedSha256.toLowerCase()}`;
}

/**
 * Durable, device-local staging for incomplete peer transfers.
 * Chunks are keyed by resource identity + expected final hash so a later
 * session can resume safely without trusting stale or mismatched data.
 */
export class ShadeNetTransferStore {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("Durable transfer staging is unavailable in this environment.");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error("Could not open transfer staging."));
      request.onblocked = () => reject(new Error("Close other Shadecode Student tabs to upgrade transfer staging."));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("transferKey", "transferKey", { unique: false });
          store.createIndex("savedAt", "savedAt", { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => { this.db?.close(); this.db = null; };
        resolve();
      };
    });
  }

  async list(resourceId: string, expectedSha256: string): Promise<PersistedTransferChunk[]> {
    await this.init();
    await this.pruneOlderThan(7 * 24 * 60 * 60 * 1000);
    const key = transferKey(resourceId, expectedSha256);
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("transferKey").getAll(key);
      request.onsuccess = () => resolve((request.result as StoredChunk[]).map(({ index, total, data, sha256, savedAt }) => ({
        index, total, data, sha256, savedAt,
      })));
      request.onerror = () => reject(request.error);
    });
  }

  async save(resourceId: string, expectedSha256: string, chunk: ResourceChunk): Promise<void> {
    await this.init();
    const key = transferKey(resourceId, expectedSha256);
    const record: StoredChunk = {
      key: `${key}:${chunk.index}`,
      transferKey: key,
      index: chunk.index,
      total: chunk.total,
      data: chunk.data.slice(0),
      sha256: chunk.sha256.toLowerCase(),
      savedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not persist transfer chunk."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Transfer chunk persistence was cancelled."));
    });
  }

  async clear(resourceId: string, expectedSha256: string): Promise<void> {
    await this.init();
    const key = transferKey(resourceId, expectedSha256);
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = store.index("transferKey").openKeyCursor(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Transfer cleanup was cancelled."));
    });
  }

  async pruneOlderThan(maxAgeMs: number): Promise<number> {
    await this.init();
    const cutoff = Date.now() - Math.max(0, maxAgeMs);
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      let removed = 0;
      const request = store.index("savedAt").openCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if ((cursor.value as StoredChunk).savedAt < cutoff) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(removed);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const shadeNetTransferStore = new ShadeNetTransferStore();
