/**
 * /lib/offline/sync.ts
 *
 * Offline data synchronization logic
 */

import { offlineStorage, type OfflineTask, type OfflineProgress } from "./storage";
import { createClient } from "@/lib/supabase/client";

export class OfflineSync {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic sync (runs every 30 seconds when online)
   */
  startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync all unsynced data
   */
  async syncAll(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    try {
      await Promise.all([
        this.syncTasks(),
        this.syncProgress(),
      ]);
    } catch (error) {
      console.error("[OfflineSync] Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync unsynced tasks
   */
  private async syncTasks(): Promise<void> {
    const unsyncedTasks = await offlineStorage.getUnsyncedTasks();
    const supabase = createClient();

    for (const task of unsyncedTasks) {
      try {
        // Update or create task on server
        const { error } = await supabase
          .from("tasks")
          .upsert({
            id: task.id,
            subject_id: task.subject_id,
            title: task.title,
            completed: task.completed,
          });

        if (error) throw error;

        // Mark as synced
        await offlineStorage.markTaskSynced(task.id);
        console.log("[OfflineSync] Synced task:", task.id);
      } catch (error) {
        console.error("[OfflineSync] Failed to sync task:", task.id, error);
      }
    }
  }

  /**
   * Sync unsynced progress
   */
  private async syncProgress(): Promise<void> {
    const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
    const supabase = createClient();

    for (const progress of unsyncedProgress) {
      try {
        // Update progress on server
        const { error } = await supabase
          .from("learn_lessons")
          .update({
            progress: progress.progress,
            updated_at: new Date().toISOString(),
          })
          .eq("id", progress.lessonId)
          .eq("user_id", progress.userId);

        if (error) throw error;

        // Mark as synced
        await offlineStorage.markProgressSynced(progress.lessonId);
        console.log("[OfflineSync] Synced progress:", progress.lessonId);
      } catch (error) {
        console.error("[OfflineSync] Failed to sync progress:", progress.lessonId, error);
      }
    }
  }

  /**
   * Save task locally for offline access
   */
  async saveTaskLocally(taskId: string): Promise<void> {
    const supabase = createClient();
    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      console.error("[OfflineSync] Failed to fetch task for offline storage:", error);
      return;
    }

    await offlineStorage.saveTask({
      id: task.id,
      subject_id: task.subject_id,
      title: task.title,
      completed: task.completed,
      lastUpdated: new Date().toISOString(),
      synced: true,
    });
  }

  /**
   * Save progress locally for offline access
   */
  async saveProgressLocally(lessonId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { data: lesson, error } = await supabase
      .from("learn_lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", userId)
      .single();

    if (error || !lesson) {
      console.error("[OfflineSync] Failed to fetch progress for offline storage:", error);
      return;
    }

    await offlineStorage.saveProgress({
      lessonId: lesson.id,
      userId: userId,
      completed: lesson.progress === 100,
      progress: lesson.progress,
      lastUpdated: new Date().toISOString(),
      synced: true,
    });
  }

  /**
   * Get all tasks (local first, fallback to server)
   */
  async getTasks(userId: string): Promise<any[]> {
    // Try local storage first
    const localTasks = await offlineStorage.getAllTasks();
    if (localTasks.length > 0) {
      return localTasks;
    }

    // Fallback to server
    const supabase = createClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("[OfflineSync] Failed to fetch tasks from server:", error);
      return [];
    }

    // Cache tasks locally
    for (const task of tasks || []) {
      await offlineStorage.saveTask({
        id: task.id,
        subject_id: task.subject_id,
        title: task.title,
        completed: task.completed,
        lastUpdated: new Date().toISOString(),
        synced: true,
      });
    }

    return tasks || [];
  }

  /**
   * Get progress (local first, fallback to server)
   */
  async getProgress(lessonId: string, userId: string): Promise<OfflineProgress | null> {
    // Try local storage first
    const localProgress = await offlineStorage.getProgress(lessonId);
    if (localProgress) {
      return localProgress;
    }

    // Fallback to server
    const supabase = createClient();
    const { data: lesson, error } = await supabase
      .from("learn_lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", userId)
      .single();

    if (error || !lesson) {
      console.error("[OfflineSync] Failed to fetch progress from server:", error);
      return null;
    }

    const progress: OfflineProgress = {
      lessonId: lesson.id,
      userId: userId,
      completed: lesson.progress === 100,
      progress: lesson.progress,
      lastUpdated: new Date().toISOString(),
      synced: true,
    };

    // Cache progress locally
    await offlineStorage.saveProgress(progress);

    return progress;
  }
}

export const offlineSync = new OfflineSync();
