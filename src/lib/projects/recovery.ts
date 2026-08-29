import type { StudentProject } from "./types";

const DB_NAME = "shadecode-project-recovery";
const DB_VERSION = 1;
const STORE = "snapshots";
const MAX_SNAPSHOTS_PER_PROJECT = 20;

export type ProjectSnapshot = {
  id: string;
  projectId: string;
  project: StudentProject;
  reason: "autosave" | "manual" | "delete";
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open recovery database"));
  });
}

export async function createProjectSnapshot(project: StudentProject, reason: ProjectSnapshot["reason"] = "autosave"): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id: `${project.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, projectId: project.id, project: structuredClone(project), reason, createdAt: Date.now() } satisfies ProjectSnapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not create recovery snapshot"));
  });
  db.close();
  await pruneProjectSnapshots(project.id);
}

export async function listProjectSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).index("projectId").getAll(projectId);
    request.onsuccess = () => { db.close(); resolve((request.result as ProjectSnapshot[]).sort((a, b) => b.createdAt - a.createdAt)); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not list recovery snapshots")); };
  });
}

export async function restoreProjectSnapshot(snapshot: ProjectSnapshot): Promise<StudentProject> {
  return structuredClone(snapshot.project);
}

async function pruneProjectSnapshots(projectId: string): Promise<void> {
  const snapshots = await listProjectSnapshots(projectId);
  if (snapshots.length <= MAX_SNAPSHOTS_PER_PROJECT) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const snapshot of snapshots.slice(MAX_SNAPSHOTS_PER_PROJECT)) tx.objectStore(STORE).delete(snapshot.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not prune recovery snapshots"));
  });
  db.close();
}
