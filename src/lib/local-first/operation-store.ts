import { type LocalOperation, type Tombstone, compareOperations, createTombstone } from "./operations";
const DB_NAME = "shadecode-operations";
const DB_VERSION = 1;
const OPERATIONS = "operations";
const TOMBSTONES = "tombstones";
export class LocalOperationStore {
  private db: IDBDatabase | null = null;
  async init(): Promise<void> { if (this.db) return; await new Promise<void>((resolve, reject) => { const r = indexedDB.open(DB_NAME, DB_VERSION); r.onerror = () => reject(r.error); r.onsuccess = () => { this.db = r.result; resolve(); }; r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(OPERATIONS)) { const s = db.createObjectStore(OPERATIONS, { keyPath: "id" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("entity", "entity", { unique: false }); s.createIndex("entityId", "entityId", { unique: false }); s.createIndex("timestamp", "timestamp", { unique: false }); } if (!db.objectStoreNames.contains(TOMBSTONES)) { const s = db.createObjectStore(TOMBSTONES, { keyPath: "operationId" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("entity", "entity", { unique: false }); s.createIndex("entityId", "entityId", { unique: false }); } }; }); }
  async append(operation: LocalOperation): Promise<boolean> { await this.init(); return new Promise((resolve, reject) => { const stores = operation.kind === "delete" ? [OPERATIONS, TOMBSTONES] : [OPERATIONS]; const tx = this.db!.transaction(stores, "readwrite"); const existing = tx.objectStore(OPERATIONS).get(operation.id); existing.onerror = () => reject(existing.error); existing.onsuccess = () => { if (existing.result) { tx.abort(); resolve(false); return; } tx.objectStore(OPERATIONS).put(operation); if (operation.kind === "delete") tx.objectStore(TOMBSTONES).put(createTombstone(operation)); }; tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); tx.onabort = () => { if (tx.error) reject(tx.error); }; }); }
  async get(id: string): Promise<LocalOperation | null> { await this.init(); return this.read(OPERATIONS, id); }
  async list(userId: string): Promise<LocalOperation[]> { await this.init(); return (await this.readAll<LocalOperation>(OPERATIONS)).filter(v => v.userId === userId).sort(compareOperations); }
  async listTombstones(userId: string): Promise<Tombstone[]> { await this.init(); return (await this.readAll<Tombstone>(TOMBSTONES)).filter(v => v.userId === userId); }
  private async read<T>(store: string, key: IDBValidKey): Promise<T | null> { return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readonly").objectStore(store).get(key); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result ?? null); }); }
  private async readAll<T>(store: string): Promise<T[]> { return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readonly").objectStore(store).getAll(); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result || []); }); }
}
export const localOperationStore = new LocalOperationStore();
