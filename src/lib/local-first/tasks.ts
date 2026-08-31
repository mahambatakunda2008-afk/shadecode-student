import type { OfflineTask } from "@/lib/offline/storage";
import { localFirstStore } from "./store";

export interface LocalTaskInput { id: string; userId: string; subject_id: string; title: string; completed?: boolean; }

function toTask(record: { id: string; userId: string; payload: unknown; deletedAt?: number }): OfflineTask | null {
  if (record.deletedAt || !record.payload || typeof record.payload !== "object") return null;
  const value = record.payload as Partial<OfflineTask>;
  return {
    id: record.id,
    userId: record.userId,
    subject_id: typeof value.subject_id === "string" ? value.subject_id : "",
    title: typeof value.title === "string" ? value.title : "",
    completed: value.completed === true,
    lastUpdated: typeof value.lastUpdated === "string" ? value.lastUpdated : new Date().toISOString(),
    synced: Boolean(value.synced),
  };
}

export const localTasks = {
  async list(userId: string): Promise<OfflineTask[]> {
    const records = await localFirstStore.list(userId);
    return records.filter((record) => record.entity === "task").map(toTask).filter((task): task is OfflineTask => task !== null);
  },
  async get(id: string, userId: string): Promise<OfflineTask | null> {
    const record = await localFirstStore.get(id);
    if (!record || record.userId !== userId || record.entity !== "task") return null;
    return toTask(record);
  },
  async create(input: LocalTaskInput): Promise<OfflineTask> {
    if (!input.userId) throw new Error("Local task creation requires a userId");
    const existing = await localTasks.get(input.id, input.userId);
    const task: OfflineTask = {
      id: input.id,
      userId: input.userId,
      subject_id: input.subject_id,
      title: input.title.trim(),
      completed: input.completed ?? existing?.completed ?? false,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };
    await localFirstStore.upsert({ id: task.id, entity: "task", userId: task.userId, payload: task });
    return task;
  },
  async complete(id: string, userId: string): Promise<OfflineTask | null> {
    const task = await localTasks.get(id, userId);
    if (!task) return null;
    const updated = { ...task, completed: true, lastUpdated: new Date().toISOString(), synced: false };
    await localFirstStore.upsert({ id, entity: "task", userId, payload: updated });
    return updated;
  },
  async remove(id: string, userId: string): Promise<void> {
    const task = await localTasks.get(id, userId);
    if (!task) return;
    await localFirstStore.remove({ id, entity: "task", userId });
  },
};
