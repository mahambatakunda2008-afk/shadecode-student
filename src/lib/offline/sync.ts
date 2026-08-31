/**
 * Offline synchronization. The canonical local-first store is the source of
 * truth for task/subject mutations; the mutation queue is the only network
 * transport. Legacy progress storage remains until progress is migrated.
 */
import { offlineStorage, type OfflineProgress, type OfflineTask, type OfflineSubject } from "./storage";
import { mutationQueue, type OfflineMutation } from "./mutationQueue";
import { createClient } from "@/lib/supabase/client";
import { localFirstStore } from "@/lib/local-first/store";
import { localTasks } from "@/lib/local-first/tasks";
import { localSubjects } from "@/lib/local-first/subjects";
import type { LocalOperation } from "@/lib/local-first/operations";

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
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
    if (typeof window !== "undefined" && this.onlineHandler) window.removeEventListener("online", this.onlineHandler);
    this.onlineHandler = null;
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    this.syncInProgress = true;
    try {
      await this.bridgeLocalOperations();
      await this.syncMutations();
      await this.syncProgress();
    } catch (error) {
      console.error("[OfflineSync] Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async queueMutation<T>(input: Omit<OfflineMutation<T>, "id" | "createdAt" | "attempts" | "ownerId">): Promise<OfflineMutation<T>> {
    const auth = await this.getCurrentUser();
    if (!auth) throw new Error("Cannot queue offline mutation without an authenticated user");

    if (input.store === "tasks") {
      const payload = input.payload as Record<string, unknown>;
      const id = typeof payload.id === "string" ? payload.id : crypto.randomUUID();
      if (input.operation === "delete") await localTasks.remove(id, auth.user.id);
      else {
        const existing = await localTasks.get(id, auth.user.id);
        await localTasks.create({
          id,
          userId: auth.user.id,
          subject_id: typeof payload.subject_id === "string" ? payload.subject_id : existing?.subject_id ?? "",
          title: typeof payload.title === "string" ? payload.title : existing?.title ?? "",
          completed: typeof payload.completed === "boolean" ? payload.completed : existing?.completed ?? false,
        });
      }
      return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), attempts: 0, ownerId: auth.user.id } as OfflineMutation<T>;
    }

    if (input.store === "subjects") {
      const payload = input.payload as Record<string, unknown>;
      const id = typeof payload.id === "string" ? payload.id : crypto.randomUUID();
      if (input.operation === "delete") await localSubjects.remove(id, auth.user.id);
      else await localSubjects.save({ id, userId: auth.user.id, name: typeof payload.name === "string" ? payload.name : "" });
      return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), attempts: 0, ownerId: auth.user.id } as OfflineMutation<T>;
    }

    return mutationQueue.enqueue({ ...input, ownerId: auth.user.id });
  }

  private async getCurrentUser() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  }

  private async bridgeLocalOperations(): Promise<void> {
    const auth = await this.getCurrentUser();
    if (!auth) return;
    const operations = await localFirstStore.listPendingOperations(auth.user.id);
    for (const operation of operations) {
      try {
        if (operation.entity !== "task" && operation.entity !== "subject") continue;
        const mutation = this.operationToMutation(operation);
        await mutationQueue.enqueue({ ...mutation, ownerId: auth.user.id });
      } catch (error) {
        console.error("[OfflineSync] Failed to bridge local operation:", operation.id, error);
      }
    }
  }

  private operationToMutation(operation: LocalOperation): Omit<OfflineMutation, "id" | "createdAt" | "attempts" | "ownerId"> {
    const store = operation.entity === "task" ? "tasks" : "subjects";
    if (operation.kind === "delete") return { operation: "delete", store, payload: { id: operation.entityId, user_id: operation.userId } };
    const raw = operation.payload;
    if (!raw || typeof raw !== "object") throw new Error(`Local ${operation.entity} operation has no payload`);
    const value = raw as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : operation.entityId;
    if (operation.entity === "task") {
      if (operation.kind === "create") return { operation: "create", store, payload: { id, user_id: operation.userId, subject_id: value.subject_id, title: value.title, completed: value.completed } };
      const changes: Record<string, unknown> = {};
      if (typeof value.subject_id === "string") changes.subject_id = value.subject_id;
      if (typeof value.title === "string") changes.title = value.title;
      if (typeof value.completed === "boolean") changes.completed = value.completed;
      return { operation: "update", store, payload: { id, user_id: operation.userId, ...changes } };
    }
    return { operation: operation.kind, store, payload: { id, user_id: operation.userId, name: value.name } };
  }

  private async syncMutations(): Promise<void> {
    const auth = await this.getCurrentUser();
    if (!auth) return;
    const { supabase, user } = auth;
    const mutations = await mutationQueue.listReady(user.id);
    for (const mutation of mutations) {
      try {
        const payload = mutation.payload as Record<string, unknown>;
        if (payload.user_id !== undefined && payload.user_id !== user.id) throw new Error("Queued mutation user_id does not match the authenticated user");
        const table = mutation.store;
        if (!table || table.includes(".") || table.includes("/") || !/^[a-zA-Z0-9_]+$/.test(table)) throw new Error(`Invalid offline mutation store: ${table}`);
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
        const entity = table === "tasks" ? "task" : table === "subjects" ? "subject" : null;
        const entityId = typeof payload.id === "string" ? payload.id : null;
        if (entity && entityId) await localFirstStore.acknowledgeEntityOperations(user.id, entity, entityId);
        await mutationQueue.remove(mutation.id, user.id);
      } catch (error) {
        await mutationQueue.recordFailure(mutation.id, user.id, error);
        console.error("[OfflineSync] Failed queued mutation:", mutation.id, error);
      }
    }
  }

  private async syncProgress(): Promise<void> {
    const auth = await this.getCurrentUser();
    if (!auth) return;
    const { supabase, user } = auth;
    const unsyncedProgress = (await offlineStorage.getUnsyncedProgress()).filter((progress) => progress.userId === user.id);
    for (const progress of unsyncedProgress) {
      try {
        const { error } = await supabase.from("learn_lessons").update({ progress: progress.progress, updated_at: new Date().toISOString() }).eq("id", progress.lessonId).eq("user_id", user.id);
        if (error) throw error;
        await offlineStorage.markProgressSynced(progress.lessonId, user.id);
      } catch (error) { console.error("[OfflineSync] Failed to sync progress:", progress.lessonId, error); }
    }
  }

  async saveTaskLocally(taskId: string): Promise<void> {
    const auth = await this.getCurrentUser(); if (!auth) return;
    const { data: task, error } = await auth.supabase.from("tasks").select("*").eq("id", taskId).eq("user_id", auth.user.id).single();
    if (error || !task) return;
    await localFirstStore.hydrate({ id: task.id, entity: "task", userId: auth.user.id, payload: { id: task.id, userId: auth.user.id, subject_id: task.subject_id, title: task.title, completed: task.completed, lastUpdated: new Date().toISOString(), synced: true }, updatedAt: Date.parse(task.updated_at ?? "") || Date.now(), deviceId: "server", version: 0 });
  }

  async saveProgressLocally(lessonId: string, userId: string): Promise<void> {
    const auth = await this.getCurrentUser(); if (!auth || auth.user.id !== userId) return;
    const { data: lesson, error } = await auth.supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", auth.user.id).single();
    if (error || !lesson) return;
    await offlineStorage.saveProgress({ lessonId: lesson.id, userId: auth.user.id, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true });
  }

  async getTasks(userId: string): Promise<OfflineTask[]> {
    const local = await localTasks.list(userId);
    if (local.length > 0) return local;
    const auth = await this.getCurrentUser(); if (!auth || auth.user.id !== userId) return [];
    const { data: tasks, error } = await auth.supabase.from("tasks").select("*").eq("user_id", auth.user.id);
    if (error) return [];
    for (const task of tasks || []) await this.saveTaskLocally(task.id);
    return localTasks.list(userId);
  }

  async getSubjects(userId: string): Promise<OfflineSubject[]> {
    const local = await localSubjects.list(userId);
    if (local.length > 0) return local;
    const auth = await this.getCurrentUser(); if (!auth || auth.user.id !== userId) return [];
    const { data: subjects, error } = await auth.supabase.from("subjects").select("*").eq("user_id", auth.user.id);
    if (error) return [];
    for (const subject of subjects || []) await localFirstStore.hydrate({ id: subject.id, entity: "subject", userId: auth.user.id, payload: { id: subject.id, userId: auth.user.id, name: subject.name, lastUpdated: new Date().toISOString(), synced: true }, updatedAt: Date.parse(subject.updated_at ?? "") || Date.now(), deviceId: "server", version: 0 });
    return localSubjects.list(userId);
  }

  async getProgress(lessonId: string, userId: string): Promise<OfflineProgress | null> {
    const localProgress = await offlineStorage.getProgress(lessonId, userId);
    if (localProgress?.userId === userId) return localProgress;
    const auth = await this.getCurrentUser(); if (!auth || auth.user.id !== userId) return null;
    const { data: lesson, error } = await auth.supabase.from("learn_lessons").select("*").eq("id", lessonId).eq("user_id", auth.user.id).single();
    if (error || !lesson) return null;
    const progress: OfflineProgress = { lessonId: lesson.id, userId: auth.user.id, completed: lesson.progress === 100, progress: lesson.progress, lastUpdated: new Date().toISOString(), synced: true };
    await offlineStorage.saveProgress(progress);
    return progress;
  }
}

export const offlineSync = new OfflineSync();
