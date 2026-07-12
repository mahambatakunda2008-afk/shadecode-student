/**
 * /lib/offline/storage.ts
 *
 * IndexedDB storage for offline lesson content
 */

const DB_NAME = "shadecode-offline";
const DB_VERSION = 1;

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

export interface OfflineNotes {
  lessonId: string;
  content: string;
  downloadedAt: string;
  lastSyncedAt?: string;
}

export interface OfflineQuiz {
  lessonId: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
  downloadedAt: string;
  lastSyncedAt?: string;
}

export interface OfflineProgress {
  lessonId: string;
  userId: string;
  completed: boolean;
  progress: number;
  quizScore?: number;
  lastUpdated: string;
  lastSyncedAt?: string;
  synced: boolean;
}

export interface OfflineTask {
  id: string;
  subject_id: string;
  title: string;
  completed: boolean;
  lastUpdated: string;
  lastSyncedAt?: string;
  synced: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Lessons store
        if (!db.objectStoreNames.contains("lessons")) {
          const lessonsStore = db.createObjectStore("lessons", { keyPath: "id" });
          lessonsStore.createIndex("subject", "subject", { unique: false });
          lessonsStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }

        // Notes store
        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", { keyPath: "lessonId" });
          notesStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }

        // Quizzes store
        if (!db.objectStoreNames.contains("quizzes")) {
          const quizzesStore = db.createObjectStore("quizzes", { keyPath: "lessonId" });
          quizzesStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }

        // Progress store
        if (!db.objectStoreNames.contains("progress")) {
          const progressStore = db.createObjectStore("progress", { keyPath: "lessonId" });
          progressStore.createIndex("userId", "userId", { unique: false });
          progressStore.createIndex("synced", "synced", { unique: false });
        }

        // Tasks store
        if (!db.objectStoreNames.contains("tasks")) {
          const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
          tasksStore.createIndex("synced", "synced", { unique: false });
        }
      };
    });
  }

  async saveLesson(lesson: OfflineLesson): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["lessons"], "readwrite");
      const store = transaction.objectStore("lessons");
      const request = store.put(lesson);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getLesson(id: string): Promise<OfflineLesson | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["lessons"], "readonly");
      const store = transaction.objectStore("lessons");
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllLessons(): Promise<OfflineLesson[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["lessons"], "readonly");
      const store = transaction.objectStore("lessons");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteLesson(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["lessons"], "readwrite");
      const store = transaction.objectStore("lessons");
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveNotes(notes: OfflineNotes): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");
      const request = store.put(notes);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getNotes(lessonId: string): Promise<OfflineNotes | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readonly");
      const store = transaction.objectStore("notes");
      const request = store.get(lessonId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveQuiz(quiz: OfflineQuiz): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["quizzes"], "readwrite");
      const store = transaction.objectStore("quizzes");
      const request = store.put(quiz);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQuiz(lessonId: string): Promise<OfflineQuiz | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["quizzes"], "readonly");
      const store = transaction.objectStore("quizzes");
      const request = store.get(lessonId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveProgress(progress: OfflineProgress): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["progress"], "readwrite");
      const store = transaction.objectStore("progress");
      const request = store.put(progress);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getProgress(lessonId: string): Promise<OfflineProgress | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["progress"], "readonly");
      const store = transaction.objectStore("progress");
      const request = store.get(lessonId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getUnsyncedProgress(): Promise<OfflineProgress[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["progress"], "readonly");
      const store = transaction.objectStore("progress");
      const index = store.index("synced");
      const request = index.getAll("false");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async markProgressSynced(lessonId: string): Promise<void> {
    const progress = await this.getProgress(lessonId);
    if (progress) {
      progress.synced = true;
      progress.lastSyncedAt = new Date().toISOString();
      await this.saveProgress(progress);
    }
  }

  async saveTask(task: OfflineTask): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tasks"], "readwrite");
      const store = transaction.objectStore("tasks");
      const request = store.put(task);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTask(id: string): Promise<OfflineTask | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tasks"], "readonly");
      const store = transaction.objectStore("tasks");
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllTasks(): Promise<OfflineTask[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tasks"], "readonly");
      const store = transaction.objectStore("tasks");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getUnsyncedTasks(): Promise<OfflineTask[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tasks"], "readonly");
      const store = transaction.objectStore("tasks");
      const index = store.index("synced");
      const request = index.getAll("false");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async markTaskSynced(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      task.synced = true;
      task.lastSyncedAt = new Date().toISOString();
      await this.saveTask(task);
    }
  }

  async getStorageSize(): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["lessons"], "readonly");
      const store = transaction.objectStore("lessons");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const lessons = request.result || [];
        const totalSize = lessons.reduce((sum, lesson) => sum + lesson.size, 0);
        resolve(totalSize);
      };
    });
  }
}

export const offlineStorage = new OfflineStorage();
