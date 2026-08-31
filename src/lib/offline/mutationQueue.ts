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
  /** Local record revision captured when the mutation was queued. */
  clientVersion?: number;
  /** Remote revision the client last observed, used for conflict detection. */
  baseVersion?: number;
  /** Stable per-install identity, distinct from the authenticated user. */
  deviceId?: string;
}

const DB_NAME = "shadecode-offline-mutations";
const DB_VERSION = 4;
const STORE = "mutations";
const MAX_ATTEMPTS = 8;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 15 * 60_000;

export const USER_SCOPED_MUTATION_STORES = new Set(["tasks", "subjects", "learn_lessons", "projects", "project_evidence", "project_milestones"]);

function createMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function retryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(BASE_RETRY_MS * 2 ** (attempts - 1), MAX_RETRY_MS);
}

export function isMutationReady(mutation: OfflineMutation, now = Date.now()): boolean {
  if (mutation.attempts >= MAX_ATTEMPTS) return false;
  if (!mutation.lastAttemptAt) return true;
  const lastAttempt = Date.parse(mutation.lastAttemptAt);
  if (!Number.isFinite(lastAttempt)) return true;
  return now - lastAttempt >= retryDelayMs(mutation.attempts);
}

function payloadEntityId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const id = value.id ?? value.entityId ?? value.projectId ?? value.project_id;
  return typeof id === "string" && id ? id : null;
}

class MutationQueue {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("Offline mutation queue requires IndexedDB");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; this.db.onversionchange = () => this.db?.close(); resolve(); };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const store = db.objectStoreNames.contains(STORE) ? transaction?.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: "id" });
        if (store && !store.indexNames.contains("ownerId")) store.createIndex("ownerId", "ownerId", { unique: false });
        if (store && !store.indexNames.contains("createdAt")) store.createIndex("createdAt", "createdAt", { unique: false });
      };
    });
  }

  async enqueue<T>(input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts">): Promise<OfflineMutation<T>> {
    if (!input.ownerId) throw new Error("Offline mutation requires an authenticated owner");
    if (!USER_SCOPED_MUTATION_STORES.has(input.store)) throw new Error(`Offline mutation store is not approved: ${input.store}`);
    await this.init();

    const entityId = payloadEntityId(input.payload);
    if (entityId) {
      const existing = (await this.list(input.ownerId)).find(
        (mutation) => mutation.store === input.store && payloadEntityId(mutation.payload) === entityId,
      );
      if (existing) {
        const replacement: OfflineMutation<T> = { ...existing, ...input, id: existing.id, createdAt: existing.createdAt, attempts: 0, lastAttemptAt: undefined, lastError: undefined };
        await this.put(replacement);
        return replacement;
      }
    }

    const mutation: OfflineMutation<T> = { ...input, id: createMutationId(), createdAt: new Date().toISOString(), attempts: 0 };
    await this.put(mutation);
    return mutation;
  }

  async list(ownerId: string): Promise<OfflineMutation[]> {
    if (!ownerId) return [];
    await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("ownerId").getAll(ownerId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(((request.result ?? []) as OfflineMutation[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    });
  }

  async listReady(ownerId: string, now = Date.now()): Promise<OfflineMutation[]> { return (await this.list(ownerId)).filter((mutation) => isMutationReady(mutation, now)); }
  async listFailed(ownerId: string): Promise<OfflineMutation[]> { return (await this.list(ownerId)).filter((mutation) => mutation.attempts >= MAX_ATTEMPTS); }
  async getStatus(ownerId: string): Promise<{ pending: number; failed: number }> { const rows = await this.list(ownerId); return { pending: rows.filter((m) => m.attempts < MAX_ATTEMPTS).length, failed: rows.filter((m) => m.attempts >= MAX_ATTEMPTS).length }; }
  async resetFailed(ownerId: string): Promise<void> { for (const mutation of await this.listFailed(ownerId)) await this.put({ ...mutation, attempts: 0, lastAttemptAt: undefined, lastError: undefined }); }
  async clearOwner(ownerId: string): Promise<void> { for (const mutation of await this.list(ownerId)) await this.remove(mutation.id, ownerId); }

  async remove(id: string, ownerId: string): Promise<void> {
    if (!ownerId) return;
    await this.init();
    const current = await this.get(id);
    if (!current || current.ownerId !== ownerId) return;
    await new Promise<void>((resolve, reject) => { const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).delete(id); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); });
  }

  async recordFailure(id: string, ownerId: string, error: unknown): Promise<void> {
    if (!ownerId) return;
    await this.init();
    const current = await this.get(id);
    if (!current || current.ownerId !== ownerId) return;
    await this.put({ ...current, attempts: Math.min(current.attempts + 1, MAX_ATTEMPTS), lastAttemptAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : String(error) });
  }

  private async get(id: string): Promise<OfflineMutation | null> { return new Promise((resolve, reject) => { const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get(id); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result ?? null); }); }
  private async put(value: OfflineMutation): Promise<void> { await new Promise<void>((resolve, reject) => { const request = this.db!.transaction(STORE, "readwrite").objectStore(STORE).put(value); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
}

export const mutationQueue = new MutationQueue();
