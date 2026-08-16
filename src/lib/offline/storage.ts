/** IndexedDB storage for offline lesson content and local-first personal data. */
const DB_NAME = "shadecode-offline";
const DB_VERSION = 4;

export interface OfflineLesson { id: string; title: string; subject: string; description?: string; blocks?: Array<{ type: string; content: string }>; difficulty?: string; downloadedAt: string; lastSyncedAt?: string; size: number; }
export interface OfflineNotes { lessonId: string; content: string; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineQuiz { lessonId: string; questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string }>; downloadedAt: string; lastSyncedAt?: string; }
export interface OfflineProgress { lessonId: string; userId: string; completed: boolean; progress: number; quizScore?: number; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineTask { id: string; userId: string; subject_id: string; title: string; completed: boolean; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }
export interface OfflineSubject { id: string; userId: string; name: string; lastUpdated: string; lastSyncedAt?: string; synced: boolean; }

class OfflineStorage {
  private db: IDBDatabase | null = null;
  async init(): Promise<void> {
    if (this.db) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("lessons")) { const s = db.createObjectStore("lessons", { keyPath: "id" }); s.createIndex("subject", "subject", { unique: false }); s.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("notes")) { const s = db.createObjectStore("notes", { keyPath: "lessonId" }); s.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("quizzes")) { const s = db.createObjectStore("quizzes", { keyPath: "lessonId" }); s.createIndex("downloadedAt", "downloadedAt", { unique: false }); }
        if (!db.objectStoreNames.contains("progress")) { const s = db.createObjectStore("progress", { keyPath: "lessonId" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("synced", "synced", { unique: false }); }
        if (!db.objectStoreNames.contains("tasks")) { const s = db.createObjectStore("tasks", { keyPath: "id" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("synced", "synced", { unique: false }); }
        if (!db.objectStoreNames.contains("subjects")) { const s = db.createObjectStore("subjects", { keyPath: "id" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("synced", "synced", { unique: false }); }
        if (!db.objectStoreNames.contains("operations")) { const s = db.createObjectStore("operations", { keyPath: "id" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("entity", "entity", { unique: false }); s.createIndex("entityId", "entityId", { unique: false }); s.createIndex("timestamp", "timestamp", { unique: false }); }
        if (!db.objectStoreNames.contains("tombstones")) { const s = db.createObjectStore("tombstones", { keyPath: "operationId" }); s.createIndex("userId", "userId", { unique: false }); s.createIndex("entity", "entity", { unique: false }); s.createIndex("entityId", "entityId", { unique: false }); }
      };
    });
  }
  async saveLesson(v: OfflineLesson): Promise<void> { if (!this.db) await this.init(); return this.put("lessons", v); }
  async getLesson(id: string): Promise<OfflineLesson | null> { return this.get("lessons", id); }
  async getAllLessons(): Promise<OfflineLesson[]> { return this.getAll("lessons"); }
  async deleteLesson(id: string): Promise<void> { return this.delete("lessons", id); }
  async saveNotes(v: OfflineNotes): Promise<void> { return this.put("notes", v); }
  async getNotes(id: string): Promise<OfflineNotes | null> { return this.get("notes", id); }
  async saveQuiz(v: OfflineQuiz): Promise<void> { return this.put("quizzes", v); }
  async getQuiz(id: string): Promise<OfflineQuiz | null> { return this.get("quizzes", id); }
  async saveProgress(v: OfflineProgress): Promise<void> { return this.put("progress", v); }
  async getProgress(id: string): Promise<OfflineProgress | null> { return this.get("progress", id); }
  async getUnsyncedProgress(): Promise<OfflineProgress[]> { return (await this.getAll<OfflineProgress>("progress")).filter(v => !v.synced); }
  async markProgressSynced(id: string): Promise<void> { const v = await this.getProgress(id); if (v) { v.synced = true; v.lastSyncedAt = new Date().toISOString(); await this.saveProgress(v); } }
  async saveTask(v: OfflineTask): Promise<void> { return this.put("tasks", v); }
  async getTask(id: string): Promise<OfflineTask | null> { return this.get("tasks", id); }
  async getTaskForUser(id: string, userId: string): Promise<OfflineTask | null> { const v = await this.getTask(id); return v?.userId === userId ? v : null; }
  async getAllTasks(): Promise<OfflineTask[]> { return this.getAll("tasks"); }
  async getTasksForUser(userId: string): Promise<OfflineTask[]> { if (!this.db) await this.init(); return this.indexGetAll("tasks", "userId", userId); }
  async getUnsyncedTasks(): Promise<OfflineTask[]> { return (await this.getAll<OfflineTask>("tasks")).filter(v => !v.synced); }
  async markTaskSynced(id: string, userId: string): Promise<void> { const v = await this.getTaskForUser(id, userId); if (v) { v.synced = true; v.lastSyncedAt = new Date().toISOString(); await this.saveTask(v); } }
  async saveSubject(v: OfflineSubject): Promise<void> { return this.put("subjects", v); }
  async getSubject(id: string): Promise<OfflineSubject | null> { return this.get("subjects", id); }
  async getSubjectForUser(id: string, userId: string): Promise<OfflineSubject | null> { const v = await this.getSubject(id); return v?.userId === userId ? v : null; }
  async getSubjectsForUser(userId: string): Promise<OfflineSubject[]> { if (!this.db) await this.init(); return this.indexGetAll("subjects", "userId", userId); }
  async getUnsyncedSubjects(): Promise<OfflineSubject[]> { return (await this.getAll<OfflineSubject>("subjects")).filter(v => !v.synced); }
  async markSubjectSynced(id: string, userId: string): Promise<void> { const v = await this.getSubjectForUser(id, userId); if (v) { v.synced = true; v.lastSyncedAt = new Date().toISOString(); await this.saveSubject(v); } }
  async getStorageSize(): Promise<number> { return (await this.getAllLessons()).reduce((sum, lesson) => sum + lesson.size, 0); }
  private async indexGetAll<T>(store: string, index: string, value: IDBValidKey): Promise<T[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readonly").objectStore(store).index(index).getAll(value); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result || []); }); }
  private async put(store: string, value: unknown): Promise<void> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readwrite").objectStore(store).put(value); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(); }); }
  private async get<T>(store: string, key: IDBValidKey): Promise<T | null> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readonly").objectStore(store).get(key); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result ?? null); }); }
  private async getAll<T>(store: string): Promise<T[]> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readonly").objectStore(store).getAll(); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result || []); }); }
  private async delete(store: string, key: IDBValidKey): Promise<void> { if (!this.db) await this.init(); return new Promise((resolve, reject) => { const r = this.db!.transaction([store], "readwrite").objectStore(store).delete(key); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(); }); }
}
export const offlineStorage = new OfflineStorage();
