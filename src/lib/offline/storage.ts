/**
 * IndexedDB storage for offline lesson content and local-first personal data.
 * Lesson progress is persisted through the canonical local-first operation log.
 */
import { localFirstStore } from "@/lib/local-first/store";

const DB_NAME = "shadecode-offline";
const DB_VERSION = 8;

export interface OfflineLesson {
  id: string; ownerUserId?: string; title: string; subject: string; subjectId?: string; topic?: string; description?: string;
  blocks?: Array<Record<string, unknown>>; difficulty?: string;
  downloadedAt: string; lastSyncedAt?: string; size: number;
  progress?: number; completed?: boolean;
  generationJobId?: string;
  generationPrompt?: string;
  generationGoal?: string;
  generationLevel?: string;
  generationExamBoard?: string;
  generationVerifiedFallback?: boolean;
  syncStatus?: "pending" | "retry-needed" | "synced" | "local-only";
  syncRetryCount?: number;
  syncRetryAfter?: number;
  syncError?: string;
}
export interface OfflineNotes { lessonId: string; userId: string; content: string; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineQuiz { lessonId: string; userId: string; questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string }>; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineProgress { lessonId: string; userId: string; completed: boolean; progress: number; quizScore?: number; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineTask { id: string; userId: string; subject_id: string; title: string; completed: boolean; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineSubject { id: string; userId: string; name: string; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }

export function isOfflineLessonOwnedBy(lesson: Pick<OfflineLesson, "ownerUserId"> | null | undefined, userId: string | null | undefined): boolean {
  return Boolean(userId && lesson?.ownerUserId && lesson.ownerUserId === userId);
}

export function isOfflineContentOwnedBy(content: { userId?: string } | null | undefined, userId: string | null | undefined): boolean {
  return Boolean(userId && content?.userId && content.userId === userId);
}

export const offlineContentKey = (userId: string, lessonId: string) => `${userId}:${lessonId}`;
export const offlineLessonKey = (userId: string, lessonId: string) => `${userId}:${lessonId}`;

const PROGRESS_STORE = "progressByUser";
const progressKey = (userId: string, lessonId: string) => `${userId}:${lessonId}`;

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable");
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      const fail = (error: unknown) => { this.initPromise = null; reject(error instanceof Error ? error : new Error("Offline database initialization failed")); };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error("Offline database upgrade is blocked by another tab"));
      request.onsuccess = () => { this.db = request.result; this.db.onversionchange = () => { this.db?.close(); this.db = null; }; this.initPromise = null; resolve(); };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = request.transaction;
        if (!db.objectStoreNames.contains("lessons")) { const store = db.createObjectStore("lessons", { keyPath: "id" }); store.createIndex("subject", "subject", { unique: false }); store.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        // Legacy ownerless stores are retained for non-destructive upgrades but are never read.
        // New records live in user-scoped stores so shared devices cannot cross-read accounts.
        if (!db.objectStoreNames.contains("notes")) { const store = db.createObjectStore("notes", { keyPath: "lessonId" }); store.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("quizzes")) { const store = db.createObjectStore("quizzes", { keyPath: "lessonId" }); store.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("lessonsByUser")) {
          const store = db.createObjectStore("lessonsByUser", { keyPath: "key" });
          store.createIndex("userId", "ownerUserId", { unique: false });
          store.createIndex("lessonId", "id", { unique: false });
          // Preserve only legacy records with a verifiable owner. Ownerless entries
          // remain in the legacy store and are never exposed to an authenticated user.
          if (db.objectStoreNames.contains("lessons") && transaction) {
            const legacy = transaction.objectStore("lessons");
            legacy.openCursor().onsuccess = (cursorEvent) => {
              const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result;
              if (!cursor) return;
              const value = cursor.value as OfflineLesson;
              if (value?.ownerUserId && value?.id) {
                store.put({ ...value, key: offlineLessonKey(value.ownerUserId, value.id) });
              }
              cursor.continue();
            };
          }
        }
        if (!db.objectStoreNames.contains("notesByUser")) { const store = db.createObjectStore("notesByUser", { keyPath: "key" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("lessonId", "lessonId", { unique: false }); }
        if (!db.objectStoreNames.contains("quizzesByUser")) { const store = db.createObjectStore("quizzesByUser", { keyPath: "key" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("lessonId", "lessonId", { unique: false }); }
        if (!db.objectStoreNames.contains("progress")) { const store = db.createObjectStore("progress", { keyPath: "lessonId" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); }
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) { const store = db.createObjectStore(PROGRESS_STORE, { keyPath: "key" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("lessonId", "lessonId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); if (db.objectStoreNames.contains("progress") && transaction) { const legacy = transaction.objectStore("progress"); legacy.openCursor().onsuccess = (cursorEvent) => { const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result; if (!cursor) return; const value = cursor.value as OfflineProgress; if (value?.userId && value?.lessonId) store.put({ ...value, key: progressKey(value.userId, value.lessonId) }); cursor.continue(); }; } }
        if (!db.objectStoreNames.contains("tasks")) { const store = db.createObjectStore("tasks", { keyPath: "id" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); } else if (transaction) { const store = transaction.objectStore("tasks"); if (!store.indexNames.contains("userId")) store.createIndex("userId", "userId", { unique: false }); }
        if (!db.objectStoreNames.contains("subjects")) { const store = db.createObjectStore("subjects", { keyPath: "id" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); }
      };
    });
    return this.initPromise;
  }
  async saveLesson(lesson: OfflineLesson): Promise<void> {
    if (!lesson.ownerUserId) throw new Error("Offline lessons require an authenticated owner");
    await this.init();
    return this.put("lessonsByUser", { ...lesson, key: offlineLessonKey(lesson.ownerUserId, lesson.id) });
  }
  async getLesson(id: string, userId?: string): Promise<OfflineLesson | null> {
    if (!userId) return null;
    await this.init();
    const lesson = await this.get<OfflineLesson & { key: string }>("lessonsByUser", offlineLessonKey(userId, id));
    return isOfflineLessonOwnedBy(lesson, userId) ? lesson : null;
  }
  async getAllLessons(userId?: string): Promise<OfflineLesson[]> {
    if (!userId) return [];
    await this.init();
    return new Promise((resolve, reject) => { const request = this.db!.transaction(["lessonsByUser"], "readonly").objectStore("lessonsByUser").index("userId").getAll(userId); request.onerror = () => reject(request.error); request.onsuccess = () => resolve((request.result || []).filter((lesson: OfflineLesson) => isOfflineLessonOwnedBy(lesson, userId))); });
  }
  async updateLesson(id: string, userId: string, patch: Partial<OfflineLesson>): Promise<OfflineLesson | null> {
    const current = await this.getLesson(id, userId);
    if (!current) return null;
    const updated = { ...current, ...patch, id: current.id, ownerUserId: current.ownerUserId };
    await this.saveLesson(updated);
    return updated;
  }
  async getPendingLessonSync(userId: string): Promise<OfflineLesson[]> {
    if (!userId) return [];
    return (await this.getAllLessons(userId)).filter((lesson) => lesson.syncStatus === "pending" || lesson.syncStatus === "retry-needed");
  }
  async deleteLesson(id: string, userId: string): Promise<void> { if (!userId) throw new Error("Deleting an offline lesson requires its authenticated owner"); await this.init(); return this.delete("lessonsByUser", offlineLessonKey(userId, id)); }
  async saveNotes(notes: OfflineNotes): Promise<void> {
    if (!notes.userId) throw new Error("Offline notes require an authenticated user");
    await this.init();
    return this.put("notesByUser", { ...notes, key: offlineContentKey(notes.userId, notes.lessonId) });
  }
  async getNotes(lessonId: string, userId?: string): Promise<OfflineNotes | null> {
    if (!userId) return null;
    await this.init();
    const notes = await this.get<OfflineNotes & { key: string }>("notesByUser", offlineContentKey(userId, lessonId));
    return isOfflineContentOwnedBy(notes, userId) ? notes : null;
  }
  async saveQuiz(quiz: OfflineQuiz): Promise<void> {
    if (!quiz.userId) throw new Error("Offline quizzes require an authenticated user");
    await this.init();
    return this.put("quizzesByUser", { ...quiz, key: offlineContentKey(quiz.userId, quiz.lessonId) });
  }
  async getQuiz(lessonId: string, userId?: string): Promise<OfflineQuiz | null> {
    if (!userId) return null;
    await this.init();
    const quiz = await this.get<OfflineQuiz & { key: string }>("quizzesByUser", offlineContentKey(userId, lessonId));
    return isOfflineContentOwnedBy(quiz, userId) ? quiz : null;
  }

  /** Compatibility facade: progress now lives in the canonical local-first store. */
  async saveProgress(progress: OfflineProgress): Promise<void> {
    if (!progress.userId) throw new Error("Offline progress requires an authenticated user");
    await localFirstStore.saveProgress({ lessonId: progress.lessonId, userId: progress.userId, completed: progress.completed, progress: progress.progress, quizScore: progress.quizScore, lastUpdated: progress.lastUpdated });
  }

  async getProgress(lessonId: string, userId?: string): Promise<OfflineProgress | null> {
    if (!userId) return null;
    const progress = await localFirstStore.getProgress(lessonId, userId);
    if (!progress) return null;
    return { ...progress, synced: false };
  }

  async getUnsyncedProgress(): Promise<OfflineProgress[]> {
    const progressRows = await localFirstStore.listPendingProgress("");
    return progressRows.map((progress) => ({ ...progress, synced: false }));
  }

  async getUnsyncedProgressForUser(userId: string): Promise<OfflineProgress[]> {
    const progressRows = await localFirstStore.listPendingProgress(userId);
    return progressRows.map((progress) => ({ ...progress, synced: false }));
  }

  async markProgressSynced(lessonId: string, userId: string): Promise<void> {
    await localFirstStore.acknowledgeProgress(userId, lessonId);
  }

  async saveTask(task: OfflineTask): Promise<void> { await this.init(); return this.put("tasks", task); }
  async getTask(id: string): Promise<OfflineTask | null> { await this.init(); return this.get("tasks", id); }
  async getTaskForUser(id: string, userId: string): Promise<OfflineTask | null> { const task = await this.getTask(id); return task?.userId === userId ? task : null; }
  async getAllTasks(): Promise<OfflineTask[]> { await this.init(); return this.getAll("tasks"); }
  async getTasksForUser(userId: string): Promise<OfflineTask[]> { await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction(["tasks"], "readonly").objectStore("tasks").index("userId").getAll(userId); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  async getUnsyncedTasks(): Promise<OfflineTask[]> { await this.init(); return this.unsynced("tasks"); }
  async markTaskSynced(taskId: string, userId: string): Promise<void> { const task = await this.getTaskForUser(taskId, userId); if (task) { task.synced = true; task.lastSyncedAt = new Date().toISOString(); await this.saveTask(task); } }
  async deleteTask(taskId: string, userId: string): Promise<void> { const task = await this.getTaskForUser(taskId, userId); if (!task) return; await this.init(); return this.delete("tasks", taskId); }
  async saveSubject(subject: OfflineSubject): Promise<void> { await this.init(); return this.put("subjects", subject); }
  async getSubject(id: string): Promise<OfflineSubject | null> { await this.init(); return this.get("subjects", id); }
  async getSubjectForUser(id: string, userId: string): Promise<OfflineSubject | null> { const subject = await this.getSubject(id); return subject?.userId === userId ? subject : null; }
  async getSubjectsForUser(userId: string): Promise<OfflineSubject[]> { await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction(["subjects"], "readonly").objectStore("subjects").index("userId").getAll(userId); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  async getUnsyncedSubjects(): Promise<OfflineSubject[]> { await this.init(); return this.unsynced("subjects"); }
  async markSubjectSynced(subjectId: string, userId: string): Promise<void> { const subject = await this.getSubjectForUser(subjectId, userId); if (subject) { subject.synced = true; subject.lastSyncedAt = new Date().toISOString(); await this.saveSubject(subject); } }
  async deleteSubject(subjectId: string, userId: string): Promise<void> { const subject = await this.getSubjectForUser(subjectId, userId); if (!subject) return; await this.init(); return this.delete("subjects", subjectId); }
  async getStorageSize(userId: string): Promise<number> { const lessons = await this.getAllLessons(userId); return lessons.reduce((sum, lesson) => sum + lesson.size, 0); }
  private async unsynced(store: string): Promise<any[]> { return new Promise((resolve, reject) => { const request = this.db!.transaction([store], "readonly").objectStore(store).getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve((request.result || []).filter((row: { synced?: boolean }) => row.synced === false)); }); }
  private async put(storeName: string, value: unknown): Promise<void> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).put(value); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).get(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || null); }); }
  private async getAll<T>(storeName: string): Promise<T[]> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  private async delete(storeName: string, key: IDBValidKey): Promise<void> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).delete(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
}
export const offlineStorage = new OfflineStorage();
