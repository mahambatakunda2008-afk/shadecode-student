import { offlineStorage, type OfflineTask } from "@/lib/offline/storage";

export interface LocalTaskInput {
  id: string;
  userId: string;
  subject_id: string;
  title: string;
  completed?: boolean;
}

/**
 * Device-first task repository.
 *
 * This module deliberately has no Supabase dependency. Callers write to the
 * device first and let the existing sync layer handle cloud reconciliation.
 */
export const localTasks = {
  async list(userId?: string): Promise<OfflineTask[]> {
    return userId ? offlineStorage.getTasksForUser(userId) : offlineStorage.getAllTasks();
  },

  async get(id: string, userId?: string): Promise<OfflineTask | null> {
    return userId ? offlineStorage.getTaskForUser(id, userId) : offlineStorage.getTask(id);
  },

  async create(input: LocalTaskInput): Promise<OfflineTask> {
    const task: OfflineTask = {
      id: input.id,
      userId: input.userId,
      subject_id: input.subject_id,
      title: input.title.trim(),
      completed: input.completed ?? false,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };

    await offlineStorage.saveTask(task);
    return task;
  },

  async complete(id: string, userId?: string): Promise<OfflineTask | null> {
    const task = userId
      ? await offlineStorage.getTaskForUser(id, userId)
      : await offlineStorage.getTask(id);
    if (!task) return null;

    const updated: OfflineTask = {
      ...task,
      completed: true,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };

    await offlineStorage.saveTask(updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    // Deletion is intentionally not exposed as a hard delete yet. The sync
    // protocol needs tombstones before deletes can safely replicate across
    // multiple devices and ShadeNet peers.
    throw new Error(
      "Local task deletion requires a sync tombstone. Use the migration layer before enabling deletes."
    );
  },
};
