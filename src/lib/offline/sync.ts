/**
 * /lib/offline/sync.ts
 *
 * Offline data synchronization logic
 */

import { offlineStorage, type OfflineProgress } from "./storage";
import { createClient } from "@/lib/supabase/client";

export class OfflineSync {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  startAutoSync(): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => { if (navigator.onLine) this.syncAll(); }, 30000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;
    this.syncInProgress = true;
    try { await Promise.all([this.syncTasks(), this.syncProgress()]); }
    catch (error) { console.error("[OfflineSync] Sync failed:", error); }
    finally { this.syncInProgress = false; }
  }

  private async syncTasks(): Promise<void> {
    const unsyncedTasks = await offlineStorage.getUnsyncedTasks();
    const supabase = createClient();
    for (const task of unsyncedTasks) {
      try {
        const { error } = await supabase.from("tasks").upsert({
          id: task.id,
          user_id: task.userId,
          subject_id: task.subject_id,
          title: task.title,
          completed: task.completed,
        });
        if (error) throw error;
        await offlineStorage.markTaskSynced(task.id, task.userId);
        console.log("[OfflineSync] Synced task:", task.id);
      } catch (error) { console.error("[OfflineSync] Failed to sync task:", task.id, error); }
    }
  }

  private async syncProgress(): Promise<void> {
    const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
    const supabase = createClient();
    for (const progress of unsyncedProgress) {
      try {
        const { error } = await supabase.from("learn_lessons").update({
          progress: progress.progress,
          updated_at: new Date().toISOString(),
        }).eq("id", progress.lessonId).eq("user_id", progress.userId);
        if (error) throw error;
        await offlineStorage.markProgressSynced(progress.lessonId);
        console.log("[OfflineSync] Synced progress:", progress.lessonId);
      } catch (error) { console.error("[OfflineSync] Failed to sync progress:", progress.lessonId, error); }
    }
  }

  async saveTaskLocally(taskId: string): Promise<void> {
    const supabase = createClient();
    const { data: task, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    if (error || !task) { console.error("[OfflineSync] Failed to fetch task for offline storage:", error); return; }
    await offlineStorage.saveTask({
      id: task.id,
      userId: task.user_id,
      subject_id: task.subject_id,
      title: task.title,
      completed: task.completed,
      lastUpdated: new Date().toISOString(),
      synced: true,
    });
  }

  async saveProgressLocally(lessonId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { data: lesson, error } = await supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", userId).single();
    if (error || !lesson) { console.error("[OfflineSync] Failed to fetch progress for offline storage:", error); return; }
    await offlineStorage.saveProgress({ lessonId: lesson.id, userId, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true });
  }

  async getTasks(userId: string): Promise<any[]> {
    const localTasks = await offlineStorage.getTasksForUser(userId);
    if (localTasks.length > 0) return localTasks;
    const supabase = createClient();
    const { data: tasks, error } = await supabase.from("tasks").select("*").eq("user_id", userId);
    if (error) { console.error("[OfflineSync] Failed to fetch tasks from server:", error); return []; }
    for (const task of tasks || []) {
      await offlineStorage.saveTask({ id: task.id, userId: task.user_id ?? userId, subject_id: task.subject_id, title: task.title, completed: task.completed, lastUpdated: new Date().toISOString(), synced: true });
    }
    return tasks || [];
  }

  async getProgress(lessonId: string, userId: string): Promise<OfflineProgress | null> {
    const localProgress = await offlineStorage.getProgress(lessonId);
    if (localProgress?.userId === userId) return localProgress;
    const supabase = createClient();
    const { data: lesson, error } = await supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", userId).single();
    if (error || !lesson) { console.error("[OfflineSync] Failed to fetch progress from server:", error); return null; }
    const progress: OfflineProgress = { lessonId: lesson.id, userId, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true };
    await offlineStorage.saveProgress(progress);
    return progress;
  }
}

export const offlineSync = new OfflineSync();
