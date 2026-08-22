import type { WorkObject } from "./types";

const DB_NAME = "shadecode-studyspace";
const DB_VERSION = 2;
const STORE = "work";
const keyFor = (userId: string, id: string) => `${userId}:${id}`;

type StoredWork = WorkObject & { key: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      } else if (transaction) {
        const legacy = transaction.objectStore(STORE);
        const replacement = db.createObjectStore("work_v2", { keyPath: "key" });
        replacement.createIndex("userId", "userId", { unique: false });
        replacement.createIndex("updatedAt", "updatedAt", { unique: false });
        legacy.openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) {
            db.deleteObjectStore(STORE);
            db.createObjectStore(STORE, { keyPath: "key" });
            const store = transaction.objectStore(STORE);
            store.createIndex("userId", "userId", { unique: false });
            store.createIndex("updatedAt", "updatedAt", { unique: false });
            return;
          }
          const value = cursor.value as WorkObject;
          if (value?.userId) replacement.put({ ...value, key: keyFor(value.userId, value.id) });
          cursor.continue();
        };
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open StudySpace"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function currentUserId(): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("StudySpace requires an authenticated user");
  return user.id;
}

export async function saveWorkObject(work: WorkObject): Promise<void> {
  if (!work.userId) throw new Error("StudySpace work requires an authenticated user");
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...work, key: keyFor(work.userId, work.id) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save work"));
  });
  db.close();
}

export async function getWorkObject(id: string, userId?: string): Promise<WorkObject | undefined> {
  const owner = userId ?? await currentUserId();
  const db = await openDb();
  const value = await new Promise<StoredWork | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(keyFor(owner, id));
    request.onsuccess = () => resolve(request.result as StoredWork | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load work"));
  });
  db.close();
  if (!value || value.userId !== owner) return undefined;
  const { key: _key, ...work } = value;
  return work;
}

export async function listWorkObjects(userId?: string): Promise<WorkObject[]> {
  const owner = userId ?? await currentUserId();
  const db = await openDb();
  const values = await new Promise<StoredWork[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).index("userId").getAll(owner);
    request.onsuccess = () => resolve((request.result as StoredWork[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error ?? new Error("Could not list work"));
  });
  db.close();
  return values.map(({ key: _key, ...work }) => work);
}

export async function deleteWorkObject(id: string, userId?: string): Promise<void> {
  const owner = userId ?? await currentUserId();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(keyFor(owner, id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete work"));
  });
  db.close();
}