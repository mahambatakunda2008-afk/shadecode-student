/**
 * /lib/offline/storage.ts
 *
 * IndexedDB storage for offline lesson content and local-first personal data.
 */

const DB_NAME = "shadecode-offline";
const DB_VERSION = 3;

export interface OfflineLesson {
  id: string;
  title: string;
  subject: string;
  description?: string;
  blocks?: Array<{ type: string; content: string }>;
  difficulty?: string;
  downloadedAt: string;
  lastSyncedAt?: string;
  size: number;
}

export interface OfflineNotes { lessonId: string; content: string; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineQuiz { lessonId: string; questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string }>; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineProgress { lessonId: string; userId: string; completed: boolean; progress: number; quizScore?: number; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineTask { id: string; userId: string; subject_id: string; title: string; completed: boolean; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineSubject { id: string; userId: string; name: string; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("lessons")) {
          const store = db.createObjectStore("lessons", { keyPath: "id" });
          store.createIndex("subject", "subject", { unique: false });
          store.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("notes")) {
          const store = db.createObjectStore("notes", { keyPath: "lessonId" });
          store.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("quizzes")) {
          const store = db.createObjectStore("quizzes", { keyPath: "lessonId" });
          store.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("progress")) {
          const store = db.createObjectStore("progress", { keyPath: "lessonId" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
        }
        if (!db.objectStoreNames.contains("tasks")) {
          const store = db.createObjectStore("tasks", { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
        } else if (request.transaction) {
          const store = request.transaction.objectStore("tasks");
          if (!store.indexNames.contains("userId")) store.createIndex("userId", "userId", { unique: false });
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            if (!cursor.value?.userId) cursor.delete();
            cursor.continue();
          };
        }
        if (!db.objectStoreNames.contains("subjects")) {
          const store = db.createObjectStore("subjects", { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
        }
      };
    });
  }

  async saveLesson(lesson: OfflineLesson): Promise<void> { if (!this.db) await this.init(); return this.put("lessons", lesson); }
  async getLesson(id: string): Promise<OfflineLesson | null> { return this.get("lessons", id); }
  async getAllLessons(): Promise<OfflineLesson[]> { return this.getAll("lessons"); }
  async deleteLesson(id: string): Promise<void> { if (!this.db) await this.init(); return this.delete("lessons", id); }
  async saveNotes(notes: OfflineNotes): Promise<void> { if (!this.db) await this.init(); return this.put("notes", notes); }
  async getNotes(lessonId: string): Promise<OfflineNotes | null> { return this.get("notes", lessonId); }
  async saveQuiz(quiz: OfflineQuiz): Promise<void> { if (!this.db) await this.init(); return this.put("quizzes", quiz); }
  async getQuiz(lessonId: string): Promise<OfflineQuiz | null> { return this.get("quizzes", lessonId); }
  async saveProgress(progress: OfflineProgress): Promise<void> { if (!this.db) await this.init(); return this.put("progress", progress); }
  async getProgress(lessonId: string): Promise<OfflineProgress | null> { return this.get("progress", lessonId); }

  async getUnsyncedProgress(): Promise<OfflineProgress[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(["progress"], "readonly").objectStore("progress").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result || []).filter((progress: OfflineProgress) => progress.synced === false));
    });
  }

  async markProgressSynced(lessonId: string): Promise<void> {
    const progress = await this.getProgress(lessonId);
    if (progress) { progress.synced = true; progress.lastSyncedAt = new Date().toISOString(); await this.saveProgress(progress); }
  }

  async saveTask(task: OfflineTask): Promise<void> { if (!this.db) await this.init(); return this.put("tasks", task); }
  async getTask(id: string): Promise<OfflineTask | null> { return this.get("tasks", id); }
  async getTaskForUser(id: string, userId: string): Promise<OfflineTask | null> { const task = await this.getTask(id); return task?.userId === userId ? task : null; }
  async getAllTasks(): Promise<OfflineTask[]> { return this.getAll("tasks"); }
  async getTasksForUser(userId: string): Promise<OfflineTask[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction(["tasks"], "readonly").objectStore("tasks").index("userId").getAll(userId); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  async getUnsyncedTasks(): Promise<OfflineTask[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const request = this.db!.transaction(["tasks"], "readonly").objectStore("tasks").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result || []).filter((task: OfflineTask) => task.synced === false));
    });
  }
  async markTaskSynced(taskId: string, userId: string): Promise<void> { const task = await this.getTaskForUser(taskId, userId); if (task) { task.synced = true; task.lastSyncedAt = new Date().toISOString(); await this.saveTask(task); } }

  async saveSubject(subject: OfflineSubject): Promise<void> { if (!this.db) await this.init(); return this.put("subjects", subject); }
  async getSubject(id: string): Promise<OfflineSubject | null> { return this.get("subjects", id); }
  async getSubjectForUser(id: string, userId: string): Promise<OfflineSubject | null> { const subject = await this.getSubject(id); return subject?.userId === userId ? subject : null; }
  async getSubjectsForUser(userId: string): Promise<OfflineSubject[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction(["subjects"], "readonly").objectStore("subjects").index("userId").getAll(userId); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  async getUnsyncedSubjects(): Promise<OfflineSubject[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction(["subjects"], "readonly").objectStore("subjects").getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve((request.result || []).filter((subject: OfflineSubject) => subject.synced === false)); }); }
  async markSubjectSynced(subjectId: string, userId: string): Promise<void> { const subject = await this.getSubjectForUser(subjectId, userId); if (subject) { subject.synced = true; subject.lastSyncedAt = new Date().toISOString(); await this.saveSubject(subject); } }

  async getStorageSize(): Promise<number> { const lessons = await this.getAllLessons(); return lessons.reduce((sum, lesson) => sum + lesson.size, 0); }

  private async put(storeName: string, value: unknown): Promise<void> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).put(value); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).get(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || null); }); }
  private async getAll<T>(storeName: string): Promise<T[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readonly").objectStore(storeName).getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result || []); }); }
  private async delete(storeName: string, key: IDBValidKey): Promise<void> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const request = this.db!.transaction([storeName], "readwrite").objectStore(storeName).delete(key); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); }
}

export const offlineStorage = new OfflineStorage();
