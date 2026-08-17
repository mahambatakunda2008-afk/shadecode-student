import type { WorkObject } from "./types";

const DB_NAME = "shadecode-studyspace";
const DB_VERSION = 1;
const STORE = "work";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open StudySpace"));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveWorkObject(work: WorkObject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(work);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save work"));
  });
  db.close();
}

export async function getWorkObject(id: string): Promise<WorkObject | undefined> {
  const db = await openDb();
  const value = await new Promise<WorkObject | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as WorkObject | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load work"));
  });
  db.close();
  return value;
}

export async function listWorkObjects(): Promise<WorkObject[]> {
  const db = await openDb();
  const values = await new Promise<WorkObject[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as WorkObject[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error ?? new Error("Could not list work"));
  });
  db.close();
  return values;
}

export async function deleteWorkObject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete work"));
  });
  db.close();
}
