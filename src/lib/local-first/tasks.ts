import { offlineStorage, type OfflineTask } from "@/lib/offline/storage";

export interface LocalTaskInput {
  id: string;
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
  async list(): Promise<OfflineTask[]> {
    return offlineStorage.getAllTasks();
  },

  async get(id: string): Promise<OfflineTask | null> {
    return offlineStorage.getTask(id);
  },

  async create(input: LocalTaskInput): Promise<OfflineTask> {
    const task: OfflineTask = {
      id: input.id,
      subject_id: input.subject_id,
      title: input.title.trim(),
      completed: input.completed ?? false,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };

    await offlineStorage.saveTask(task);
    return task;
  },

  async complete(id: string): Promise<OfflineTask | null> {
    const task = await offlineStorage.getTask(id);
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
