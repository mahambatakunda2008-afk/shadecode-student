export type OfflineMutationOperation = "create" | "update" | "delete";

export interface OfflineMutation<T = unknown> {
  id: string;
  ownerId: string;
  operation: OfflineMutationOperation;
  store: string;
  payload: T;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

const DB_NAME = "shadecode-offline-mutations";
const DB_VERSION = 2;
const STORE = "mutations";
const MAX_ATTEMPTS = 8;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 15 * 60_000;

/** Only stores whose rows are explicitly scoped by user_id may use the generic queue. */
export const USER_SCOPED_MUTATION_STORES = new Set(["tasks", "subjects", "learn_lessons"]);

function createMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function retryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(BASE_RETRY_MS * 2 ** (attempts - 1), MAX_RETRY_MS);
}

export function isMutationDeadLetter(mutation: OfflineMutation): boolean {
  return mutation.attempts >= MAX_ATTEMPTS;
}

export function isMutationReady(mutation: OfflineMutation, now = Date.now()): boolean {
  if (isMutationDeadLetter(mutation)) return false;
  if (!mutation.lastAttemptAt) return true;
  const lastAttempt = Date.parse(mutation.lastAttemptAt);
  if (!Number.isFinite(lastAttempt)) return true;
  return now - lastAttempt >= retryDelayMs(mutation.attempts);
}

class MutationQueue {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("Offline mutation queue requires IndexedDB");

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => this.db?.close();
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const store = db.objectStoreNames.contains(STORE)
          ? transaction?.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath: "id" });
        if (store && !store.indexNames.contains("ownerId")) store.createIndex("ownerId", "ownerId", { unique: false });
        if (store && !store.indexNames.contains("createdAt")) store.createIndex("createdAt", "createdAt", { unique: false });
      };
    });
  }

  async enqueue<T>(input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts">): Promise<OfflineMutation<T>> {
    if (!input.ownerId) throw new Error("Offline mutation requires an authenticated owner");
    if (!USER_SCOPED_MUTATION_STORES.has(input.store)) {
      throw new Error(`Offline mutation store is not approved: ${input.store}`);
    }
    await this.init();

    const mutation: OfflineMutation<T> = {
      ...input,
      id: createMutationId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    await this.put(mutation);
    return mutation;
  }

  async list(ownerId: string): Promise<OfflineMutation[]> {
    if (!ownerId) return [];
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("ownerId").getAll(ownerId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const rows = (request.result ?? []) as OfflineMutation[];
        resolve(rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      };
    });
  }

  async listReady(ownerId: string, now = Date.now()): Promise<OfflineMutation[]> {
    const rows = await this.list(ownerId);
    return rows.filter((mutation) => isMutationReady(mutation, now));
  }

  async listDeadLetters(ownerId: string): Promise<OfflineMutation[]> {
    const rows = await this.list(ownerId);
    return rows.filter(isMutationDeadLetter);
  }

  /** Reset a failed mutation so the next connectivity cycle retries it immediately. */
  async retry(id: string, ownerId: string): Promise<void> {
    if (!ownerId) return;
    await this.init();
    const current = await this.get(id);
    if (!current || current.ownerId !== ownerId) return;
    await this.put({
      ...current,
      attempts: 0,
      lastAttemptAt: undefined,
      lastError: undefined,
    });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    if (!ownerId) return;
    await this.init();
    const current = await this.get(id);
    if (!current || current.ownerId !== ownerId) return;
    await new Promise<void>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async recordFailure(id: string, ownerId: string, error: unknown): Promise<void> {
    if (!ownerId) return;
    await this.init();
    const current = await this.get(id);
    if (!current || current.ownerId !== ownerId) return;
    await this.put({
      ...current,
      attempts: Math.min(current.attempts + 1, MAX_ATTEMPTS),
      lastAttemptAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : String(error),
    });
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
