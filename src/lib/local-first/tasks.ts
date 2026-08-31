import { offlineStorage, type OfflineTask } from "@/lib/offline/storage";
import { localFirstStore } from "./store";

export interface LocalTaskInput { id: string; userId: string; subject_id: string; title: string; completed?: boolean; }

export const localTasks = {
  async list(userId: string): Promise<OfflineTask[]> { return offlineStorage.getTasksForUser(userId); },
  async get(id: string, userId: string): Promise<OfflineTask | null> { return offlineStorage.getTaskForUser(id, userId); },
  async create(input: LocalTaskInput): Promise<OfflineTask> {
    if (!input.userId) throw new Error("Local task creation requires a userId");
    const task: OfflineTask = { id: input.id, userId: input.userId, subject_id: input.subject_id, title: input.title.trim(), completed: input.completed ?? false, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveTask(task);
    await localFirstStore.upsert({ id: task.id, entity: "task", userId: task.userId, payload: task });
    return task;
  },
  async complete(id: string, userId: string): Promise<OfflineTask | null> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return null;
    const updated: OfflineTask = { ...task, completed: true, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveTask(updated);
    await localFirstStore.upsert({ id, entity: "task", userId, payload: updated });
    return updated;
  },
  async remove(id: string, userId: string): Promise<void> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return;
    await offlineStorage.deleteTask(id, userId);
    await localFirstStore.remove({ id, entity: "task", userId });
  },
};
