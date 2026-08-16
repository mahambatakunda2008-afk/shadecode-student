/**
 * Durable offline mutation queue.
 *
 * Keeps local mutations separate from cached records so sync can retry
 * safely and eventually support conflict resolution without losing intent.
 */

export type MutationOperation = "upsert" | "update" | "delete";

export interface OfflineMutation<T = Record<string, unknown>> {
  id: string;
  store: string;
  operation: MutationOperation;
  payload: T;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

const DB_NAME = "shadecode-offline";
const DB_VERSION = 4;
const STORE = "mutations";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

class MutationQueue {
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
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async enqueue<T>(input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts">): Promise<OfflineMutation<T>> {
    await this.init();
    const mutation: OfflineMutation<T> = {
      ...input,
      id: uuid(),
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await this.put(mutation);
    return mutation;
  }

  async list<T = Record<string, unknown>>(): Promise<OfflineMutation<T>[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("createdAt").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async remove(id: string): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async recordFailure(id: string, error: unknown): Promise<void> {
    await this.init();
    const current = await this.get(id);
    if (!current) return;
    current.attempts += 1;
    current.lastAttemptAt = new Date().toISOString();
    current.lastError = error instanceof Error ? error.message : String(error);
    await this.put(current);
  }

  private async get(id: string): Promise<OfflineMutation | null> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async put(value: OfflineMutation): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).put(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const mutationQueue = new MutationQueue();
