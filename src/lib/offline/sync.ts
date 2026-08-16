/**
 * Offline data synchronization logic.
 *
 * Cached records remain available for reads, while writes can be queued as
 * durable, account-scoped mutations and retried without losing the user's intent.
 */

import { offlineStorage, type OfflineProgress, type OfflineTask, type OfflineSubject } from "./storage";
import { mutationQueue, type OfflineMutation } from "./mutationQueue";
import { createClient } from "@/lib/supabase/client";

export class OfflineSync {
  private syncInProgress = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;

  startAutoSync(): void {
    if (this.syncInterval) return;

    if (typeof window !== "undefined") {
      this.onlineHandler = () => void this.syncAll();
      window.addEventListener("online", this.onlineHandler);
    }

    this.syncInterval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) void this.syncAll();
    }, 30000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (typeof window !== "undefined" && this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
    }
    this.onlineHandler = null;
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    this.syncInProgress = true;
    try {
      await this.syncMutations();
      await Promise.all([this.syncTasks(), this.syncSubjects(), this.syncProgress()]);
    } catch (error) {
      console.error("[OfflineSync] Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /** Queue a write only for the currently authenticated account. */
  async queueMutation<T>(
    input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts" | "ownerId">
  ): Promise<OfflineMutation<T>> {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Cannot queue offline mutation without an authenticated user");
    return mutationQueue.enqueue({ ...input, ownerId: user.id });
  }

  private async syncMutations(): Promise<void> {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;

    const mutations = await mutationQueue.list(user.id);

    for (const mutation of mutations) {
      try {
        const payload = mutation.payload as Record<string, unknown>;
        const payloadUserId = payload.user_id;
        if (payloadUserId !== undefined && payloadUserId !== user.id) {
          throw new Error("Queued mutation user_id does not match the authenticated user");
        }

        const table = mutation.store;
        if (!table || table.includes(".") || table.includes("/") || !/^[a-zA-Z0-9_]+$/.test(table)) {
          throw new Error(`Invalid offline mutation store: ${table}`);
        }

        if (mutation.operation === "delete") {
          const id = payload.id;
          if (typeof id !== "string") throw new Error("Delete mutation requires a string id");
          const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
          if (error) throw error;
        } else if (mutation.operation === "update") {
          const id = payload.id;
          if (typeof id !== "string") throw new Error("Update mutation requires a string id");
          const { id: _id, user_id: _userId, ...changes } = payload;
          const { error } = await supabase.from(table).update(changes).eq("id", id).eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).upsert({ ...payload, user_id: user.id });
          if (error) throw error;
        }

        await mutationQueue.remove(mutation.id, user.id);
      } catch (error) {
        await mutationQueue.recordFailure(mutation.id, user.id, error);
        console.error("[OfflineSync] Failed queued mutation:", mutation.id, error);
      }
    }
  }

  private async syncTasks(): Promise<void> {
    const unsyncedTasks = await offlineStorage.getUnsyncedTasks();
    const supabase = createClient();
    for (const task of unsyncedTasks) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== task.userId) continue;
        const { error } = await supabase.from("tasks").upsert({ id: task.id, user_id: user.id, subject_id: task.subject_id, title: task.title, completed: task.completed });
        if (error) throw error;
        await offlineStorage.markTaskSynced(task.id, task.userId);
      } catch (error) { console.error("[OfflineSync] Failed to sync task:", task.id, error); }
    }
  }

  private async syncSubjects(): Promise<void> {
    const unsyncedSubjects = await offlineStorage.getUnsyncedSubjects();
    const supabase = createClient();
    for (const subject of unsyncedSubjects) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== subject.userId) continue;
        const { error } = await supabase.from("subjects").upsert({ id: subject.id, user_id: user.id, name: subject.name });
        if (error) throw error;
        await offlineStorage.markSubjectSynced(subject.id, subject.userId);
      } catch (error) { console.error("[OfflineSync] Failed to sync subject:", subject.id, error); }
    }
  }

  private async syncProgress(): Promise<void> {
    const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
    const supabase = createClient();
    for (const progress of unsyncedProgress) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== progress.userId) continue;
        const { error } = await supabase.from("learn_lessons").update({ progress: progress.progress, updated_at: new Date().toISOString() }).eq("id", progress.lessonId).eq("user_id", user.id);
        if (error) throw error;
        await offlineStorage.markProgressSynced(progress.lessonId);
      } catch (error) { console.error("[OfflineSync] Failed to sync progress:", progress.lessonId, error); }
    }
  }

  async saveTaskLocally(taskId: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: task, error } = await supabase.from("tasks").select("*").eq("id", taskId).eq("user_id", user.id).single();
    if (error || !task) return;
    await offlineStorage.saveTask({ id: task.id, userId: task.user_id, subject_id: task.subject_id, title: task.title, completed: task.completed, lastUpdated: new Date().toISOString(), synced: true });
  }

  async saveProgressLocally(lessonId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return;
    const { data: lesson, error } = await supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", user.id).single();
    if (error || !lesson) return;
    await offlineStorage.saveProgress({ lessonId: lesson.id, userId: user.id, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true });
  }

  async getTasks(userId: string): Promise<OfflineTask[]> {
    const localTasks = await offlineStorage.getTasksForUser(userId);
    if (localTasks.length > 0) return localTasks;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return [];
    const { data: tasks, error } = await supabase.from("tasks").select("*").eq("user_id", user.id);
    if (error) return [];
    for (const task of tasks || []) await offlineStorage.saveTask({ id: task.id, userId: task.user_id ?? user.id, subject_id: task.subject_id, title: task.title, completed: task.completed, lastUpdated: new Date().toISOString(), synced: true });
    return tasks || [];
  }

  async getSubjects(userId: string): Promise<OfflineSubject[]> {
    const localSubjects = await offlineStorage.getSubjectsForUser(userId);
    if (localSubjects.length > 0) return localSubjects;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return [];
    const { data: subjects, error } = await supabase.from("subjects").select("*").eq("user_id", user.id);
    if (error) return [];
    for (const subject of subjects || []) await offlineStorage.saveSubject({ id: subject.id, userId: subject.user_id ?? user.id, name: subject.name, lastUpdated: new Date().toISOString(), synced: true });
    return subjects || [];
  }

  async getProgress(lessonId: string, userId: string): Promise<OfflineProgress | null> {
    const localProgress = await offlineStorage.getProgress(lessonId);
    if (localProgress?.userId === userId) return localProgress;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return null;
    const { data: lesson, error } = await supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", user.id).single();
    if (error || !lesson) return null;
    const progress: OfflineProgress = { lessonId: lesson.id, userId: user.id, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true };
    await offlineStorage.saveProgress(progress);
    return progress;
  }
}

export const offlineSync = new OfflineSync();
