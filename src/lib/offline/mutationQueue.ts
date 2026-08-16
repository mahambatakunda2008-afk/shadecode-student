export type OfflineMutationOperation = "create" | "update" | "delete";

export interface OfflineMutation<T = unknown> {
  id: string;
  operation: OfflineMutationOperation;
  store: string;
  payload: T;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const DB_NAME = "shadecode-offline-mutations";
const DB_VERSION = 1;
const STORE = "mutations";

class MutationQueue {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
      };
    });
  }

  async enqueue<T>(input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts">): Promise<OfflineMutation<T>> {
    await this.init();
    const mutation: OfflineMutation<T> = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await this.put(mutation);
    return mutation;
  }

  async list(): Promise<OfflineMutation[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
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
    await this.put({ ...current, attempts: current.attempts + 1, lastError: error instanceof Error ? error.message : String(error) });
  }

  private async get(id: string): Promise<OfflineMutation | null> {
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
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
