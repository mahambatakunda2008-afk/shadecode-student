import { offlineStorage, type OfflineSubject, type OfflineTask } from "@/lib/offline/storage";

export interface ServerSnapshot {
  tasks: OfflineTask[];
  subjects: OfflineSubject[];
}

/**
 * One-way, non-destructive hydration used during the local-first migration.
 * Existing local records are preserved. This is deliberately not a delete or
 * reconciliation routine and can therefore be run repeatedly during rollout.
 */
export async function hydrateLocalSnapshot(snapshot: ServerSnapshot): Promise<void> {
  for (const subject of snapshot.subjects) {
    if (!subject.userId) continue;
    const existing = await offlineStorage.getSubjectForUser(subject.id, subject.userId);
    if (!existing || new Date(subject.lastUpdated).getTime() > new Date(existing.lastUpdated).getTime()) {
      await offlineStorage.saveSubject({ ...subject, synced: true });
    }
  }

  for (const task of snapshot.tasks) {
    if (!task.userId) continue;
    const existing = await offlineStorage.getTaskForUser(task.id, task.userId);
    if (!existing || new Date(task.lastUpdated).getTime() > new Date(existing.lastUpdated).getTime()) {
      await offlineStorage.saveTask({ ...task, synced: true });
    }
  }
}
