import { StudentProject } from "./types";

const DB_NAME = "shadecode-student";
const DB_VERSION = 2;
const PROJECTS = "project-records";
const MUTATIONS = "project-mutations";

export type ProjectMutation = { id: string; projectId: string; operation: "upsert" | "delete"; project?: StudentProject; createdAt: number; attempts: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(MUTATIONS)) db.createObjectStore(MUTATIONS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local project database"));
  });
}

export async function atomicallySaveProject(project: StudentProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PROJECTS, MUTATIONS], "readwrite");
    tx.objectStore(PROJECTS).put({ ...project, id: project.id });
    tx.objectStore(MUTATIONS).put({ id: `project:${project.id}:${project.updatedAt}`, projectId: project.id, operation: "upsert", project, createdAt: Date.now(), attempts: 0 } satisfies ProjectMutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save project atomically"));
    tx.onabort = () => reject(tx.error ?? new Error("Project transaction aborted"));
  });
  db.close();
}

export async function atomicallyDeleteProject(projectId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PROJECTS, MUTATIONS], "readwrite");
    tx.objectStore(PROJECTS).delete(projectId);
    tx.objectStore(MUTATIONS).put({ id: `project:${projectId}:delete:${Date.now()}`, projectId, operation: "delete", createdAt: Date.now(), attempts: 0 } satisfies ProjectMutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete project atomically"));
  });
  db.close();
}
