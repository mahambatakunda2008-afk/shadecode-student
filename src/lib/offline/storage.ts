/**
 * IndexedDB storage for offline lesson content and local-first personal data.
 * Lesson progress is persisted through the canonical local-first operation log.
 */
import { localFirstStore } from "@/lib/local-first/store";

const DB_NAME = "shadecode-offline";
const DB_VERSION = 6;

export interface OfflineLesson {
  id: string; title: string; subject: string; description?: string;
  blocks?: Array<Record<string, unknown>>; difficulty?: string;
  downloadedAt: string; lastSyncedAt?: string; size: number;
  progress?: number; completed?: boolean;
}
export interface OfflineNotes { lessonId: string; content: string; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineQuiz { lessonId: string; questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string }>; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineProgress { lessonId: string; userId: string; completed: boolean; progress: number; quizScore?: number; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineTask { id: string; userId: string; subject_id: string; title: string; completed: boolean; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineSubject { id: string; userId: string; name: string; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }

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
        if (!db.objectStoreNames.contains("notes")) { const store = db.createObjectStore("notes", { keyPath: "lessonId" }); store.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("quizzes")) { const store = db.createObjectStore("quizzes", { keyPath: "lessonId" }); store.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("progress")) { const store = db.createObjectStore("progress", { keyPath: "lessonId" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); }
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) { const store = db.createObjectStore(PROGRESS_STORE, { keyPath: "key" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("lessonId", "lessonId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); if (db.objectStoreNames.contains("progress") && transaction) { const legacy = transaction.objectStore("progress"); legacy.openCursor().onsuccess = (cursorEvent) => { const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue | null>).result; if (!cursor) return; const value = cursor.value as OfflineProgress; if (value?.userId && value?.lessonId) store.put({ ...value, key: progressKey(value.userId, value.lessonId) }); cursor.continue(); }; } }
        if (!db.objectStoreNames.contains("tasks")) { const store = db.createObjectStore("tasks", { keyPath: "id" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); } else if (transaction) { const store = transaction.objectStore("tasks"); if (!store.indexNames.contains("userId")) store.createIndex("userId", "userId", { unique: false }); }
        if (!db.objectStoreNames.contains("subjects")) { const store = db.createObjectStore("subjects", { keyPath: "id" }); store.createIndex("userId", "userId", { unique: false }); store.createIndex("synced", "synced", { unique: false }); }
      };
    });
    return this.initPromise;
  }
  async saveLesson(lesson: OfflineLesson): Promise<void> { await this.init(); return this.put("lessons", lesson); }
  async getLesson(id: string): Promise<OfflineLesson | null> { await this.init(); return this.get("lessons", id); }
  async getAllLessons(): Promise<OfflineLesson[]> { await this.init(); return this.getAll("lessons"); }
  async deleteLesson(id: string): Promise<void> { await this.init(); return this.delete("lessons", id); }
  async saveNotes(notes: OfflineNotes): Promise<void> { await this.init(); return this.put("notes", notes); }
  async getNotes(lessonId: string): Promise<OfflineNotes | null> { await this.init(); return this.get("notes", lessonId); }
  async saveQuiz(quiz: OfflineQuiz): Promise<void> { await this.init(); return this.put("quizzes", quiz); }
  async getQuiz(lessonId: string): Promise<OfflineQuiz | null> { await this.init(); return this.get("quizzes", lessonId); }

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
  async getStorageSize(): Promise<number> { const lessons = await this.getAllLessons(); return lessons.reduce((sum, lesson) => sum + lesson.size, 0); }
  private async unsynced(store: string): Promise<any[]> { return new Promise((resolve, reject) => { const request = this.db!.transaction([store], "readonly").objectStore(store).getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve((request.result || []).filter((row: { synced?: boolean }) => row.synced === false)); }); }
  private async put(storeName: string, value: unknown): Promise<void> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).put(value); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).get(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || null); }); }
  private async getAll<T>(storeName: string): Promise<T[]> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  private async delete(storeName: string, key: IDBValidKey): Promise<void> { return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).delete(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
}
export const offlineStorage = new OfflineStorage();
