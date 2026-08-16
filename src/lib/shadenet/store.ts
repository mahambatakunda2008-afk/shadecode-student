import type { ShadeNetResource } from "./content";
const DB_NAME = "shadecode-shadenet";
const DB_VERSION = 1;
const STORE = "resources";
export class ShadeNetStore {
  private db: IDBDatabase | null = null;
  async init(): Promise<void> { if (this.db) return; await new Promise<void>((resolve, reject) => { const r = indexedDB.open(DB_NAME, DB_VERSION); r.onerror = () => reject(r.error); r.onsuccess = () => { this.db = r.result; resolve(); }; r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) { const s = db.createObjectStore(STORE, { keyPath: "contentHash" }); s.createIndex("type", "metadata.type", { unique: false }); s.createIndex("subject", "metadata.subject", { unique: false }); } }; }); }
  async put<T>(resource: ShadeNetResource<T>): Promise<void> { await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([STORE], "readwrite").objectStore(STORE).put(resource); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(); }); }
  async get<T>(hash: string): Promise<ShadeNetResource<T> | null> { await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([STORE], "readonly").objectStore(STORE).get(hash); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result ?? null); }); }
  async has(hash: string): Promise<boolean> { return (await this.get(hash)) !== null; }
  async list(): Promise<ShadeNetResource[]> { await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([STORE], "readonly").objectStore(STORE).getAll(); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result || []); }); }
}
export const shadeNetStore = new ShadeNetStore();
