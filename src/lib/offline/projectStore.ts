import type { StudentProject } from "@/lib/projects/types";

const DB_NAME = "shadecode-student-local";
const DB_VERSION = 1;
const STORE = "projects";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
  });
}

export async function getLocalProjects(): Promise<StudentProject[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result ?? []) as StudentProject[]);
  });
}

export async function putLocalProject(project: StudentProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(project);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteLocalProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
