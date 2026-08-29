import { StudentProject } from "./types";

const DB_NAME = "shadecode-student-projects";
const DB_VERSION = 1;
const PROJECTS = "project-records";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local project database"));
  });
}

export async function atomicallySaveProject(project: StudentProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROJECTS, "readwrite");
    tx.objectStore(PROJECTS).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save project locally"));
    tx.onabort = () => reject(tx.error ?? new Error("Project transaction aborted"));
  });
  db.close();
}

export async function atomicallyDeleteProject(projectId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROJECTS, "readwrite");
    tx.objectStore(PROJECTS).delete(projectId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete project locally"));
  });
  db.close();
}
