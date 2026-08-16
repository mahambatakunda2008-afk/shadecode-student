import { offlineStorage, type OfflineTask } from "@/lib/offline/storage";
import { localOperationStore } from "./operation-store";
import { createOperationId } from "./operations";
import { getDeviceId } from "./device";

export interface LocalTaskInput { id: string; userId: string; subject_id: string; title: string; completed?: boolean; }
const sequenceKey = "shadecode:operation-sequence";
async function nextSequence(): Promise<number> {
  if (typeof window === "undefined") return Date.now();
  const next = Number(window.localStorage.getItem(sequenceKey) || "0") + 1;
  window.localStorage.setItem(sequenceKey, String(next));
  return next;
}
async function record(userId: string, entityId: string, kind: "create" | "update" | "delete", payload?: unknown): Promise<void> {
  const deviceId = getDeviceId();
  const sequence = await nextSequence();
  await localOperationStore.append({ id: createOperationId(deviceId, sequence), deviceId, userId, entity: "task", entityId, kind, payload, timestamp: new Date().toISOString(), sequence });
}

export const localTasks = {
  async list(userId: string): Promise<OfflineTask[]> { return offlineStorage.getTasksForUser(userId); },
  async get(id: string, userId: string): Promise<OfflineTask | null> { return offlineStorage.getTaskForUser(id, userId); },
  async create(input: LocalTaskInput): Promise<OfflineTask> {
    if (!input.userId) throw new Error("Local task creation requires a userId");
    const task: OfflineTask = { id: input.id, userId: input.userId, subject_id: input.subject_id, title: input.title.trim(), completed: input.completed ?? false, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveTask(task);
    await record(input.userId, input.id, "create", task);
    return task;
  },
  async complete(id: string, userId: string): Promise<OfflineTask | null> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return null;
    const updated: OfflineTask = { ...task, completed: true, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveTask(updated);
    await record(userId, id, "update", { completed: true, lastUpdated: updated.lastUpdated });
    return updated;
  },
  async remove(id: string, userId: string): Promise<void> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return;
    await record(userId, id, "delete");
    // The materialized row remains until reconciliation safely applies the tombstone.
  },
};
