import { offlineStorage, type OfflineTask } from "@/lib/offline/storage";
import { localOperationStore } from "./operation-store";
import { createOperationId } from "./operations";
import { getDeviceId } from "./device";

export interface LocalTaskInput { id: string; userId: string; subject_id: string; title: string; completed?: boolean; }

let sequence = 0;
function nextSequence(): number { sequence += 1; return sequence; }
function now(): string { return new Date().toISOString(); }

async function record(userId: string, entityId: string, kind: "create" | "update" | "delete", payload?: unknown): Promise<void> {
  const deviceId = getDeviceId();
  const seq = nextSequence();
  await localOperationStore.append({ id: createOperationId(deviceId, seq), deviceId, userId, entity: "task", entityId, kind, payload, timestamp: now(), sequence: seq });
}

export const localTasks = {
  async list(userId: string): Promise<OfflineTask[]> { return offlineStorage.getTasksForUser(userId); },
  async get(id: string, userId: string): Promise<OfflineTask | null> { return offlineStorage.getTaskForUser(id, userId); },

  async create(input: LocalTaskInput): Promise<OfflineTask> {
    if (!input.userId) throw new Error("Local task creation requires a userId");
    const task: OfflineTask = { id: input.id, userId: input.userId, subject_id: input.subject_id, title: input.title.trim(), completed: input.completed ?? false, lastUpdated: now(), synced: false };
    await offlineStorage.saveTask(task);
    await record(input.userId, input.id, "create", task);
    return task;
  },

  async complete(id: string, userId: string): Promise<OfflineTask | null> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return null;
    const updated: OfflineTask = { ...task, completed: true, lastUpdated: now(), synced: false };
    await offlineStorage.saveTask(updated);
    await record(userId, id, "update", { completed: true, lastUpdated: updated.lastUpdated });
    return updated;
  },

  async remove(id: string, userId: string): Promise<void> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return;
    await record(userId, id, "delete");
    // Keep the materialized row until reconciliation can safely apply the tombstone.
    throw new Error("Local task deletion is recorded as a tombstone; physical removal waits for reconciliation.");
  },
};
