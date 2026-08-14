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
 * User scope is mandatory on every read/update so one browser cannot expose
 * another account's locally cached tasks. This module deliberately has no
 * Supabase dependency. Callers write to the device first and let the existing
 * sync layer handle cloud reconciliation.
 */
export const localTasks = {
  async list(userId: string): Promise<OfflineTask[]> {
    return offlineStorage.getTasksForUser(userId);
  },

  async get(id: string, userId: string): Promise<OfflineTask | null> {
    return offlineStorage.getTaskForUser(id, userId);
  },

  async create(input: LocalTaskInput): Promise<OfflineTask> {
    if (!input.userId) throw new Error("Local task creation requires a userId");

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

  async complete(id: string, userId: string): Promise<OfflineTask | null> {
    const task = await offlineStorage.getTaskForUser(id, userId);
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

  async remove(id: string, userId: string): Promise<void> {
    const task = await offlineStorage.getTaskForUser(id, userId);
    if (!task) return;

    // Deletion is intentionally not exposed as a hard delete yet. The sync
    // protocol needs tombstones before deletes can safely replicate across
    // multiple devices and ShadeNet peers.
    throw new Error(
      "Local task deletion requires a sync tombstone. Use the migration layer before enabling deletes.",
    );
  },
};
