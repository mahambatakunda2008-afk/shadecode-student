/**
 * /lib/offline/downloadManager.ts
 *
 * Download manager for offline lesson content
 */

import { offlineStorage, OfflineLesson, OfflineNotes, OfflineQuiz, OfflineProgress } from "./storage";
import { log } from "@/lib/observability";

export interface DownloadProgress {
  lessonId: string;
  type: "lesson" | "notes" | "quiz";
  progress: number;
  status: "pending" | "downloading" | "completed" | "error";
  error?: string;
}

class DownloadManager {
  private activeDownloads: Map<string, DownloadProgress> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadLesson(
    lessonId: string,
    lessonData: unknown,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const downloadId = `${lessonId}-lesson`;
    
    this.activeDownloads.set(downloadId, {
      lessonId,
      type: "lesson",
      progress: 0,
      status: "downloading",
    });

    try {
      const size = JSON.stringify(lessonData).length;
      const data = lessonData as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const offlineLesson: OfflineLesson = {
        id: lessonId,
        title: data.title,
        subject: data.subject,
        description: data.description,
        blocks: data.blocks,
        difficulty: data.difficulty,
        downloadedAt: new Date().toISOString(),
        size,
      };

      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const progress = this.activeDownloads.get(downloadId);
        if (progress) {
          progress.progress = i;
          onProgress?.(i);
        }
      }

      await offlineStorage.saveLesson(offlineLesson);
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.progress = 100;
        progress.status = "completed";
      }
      onProgress?.(100);
    } catch (error) {
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.status = "error";
        progress.error = error instanceof Error ? error.message : "Download failed";
      }
      throw error;
    }
  }

  async downloadNotes(
    lessonId: string,
    notesContent: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const downloadId = `${lessonId}-notes`;
    
    this.activeDownloads.set(downloadId, {
      lessonId,
      type: "notes",
      progress: 0,
      status: "downloading",
    });

    try {
      const offlineNotes: OfflineNotes = {
        lessonId,
        content: notesContent,
        downloadedAt: new Date().toISOString(),
      };

      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 30));
        const progress = this.activeDownloads.get(downloadId);
        if (progress) {
          progress.progress = i;
          onProgress?.(i);
        }
      }

      await offlineStorage.saveNotes(offlineNotes);
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.progress = 100;
        progress.status = "completed";
      }
      onProgress?.(100);
    } catch (error) {
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.status = "error";
        progress.error = error instanceof Error ? error.message : "Download failed";
      }
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadQuiz(
    lessonId: string,
    quizData: unknown,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const downloadId = `${lessonId}-quiz`;
    
    this.activeDownloads.set(downloadId, {
      lessonId,
      type: "quiz",
      progress: 0,
      status: "downloading",
    });

    try {
      const data = quizData as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const offlineQuiz: OfflineQuiz = {
        lessonId,
        questions: data.questions || [],
        downloadedAt: new Date().toISOString(),
      };

      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 30));
        const progress = this.activeDownloads.get(downloadId);
        if (progress) {
          progress.progress = i;
          onProgress?.(i);
        }
      }

      await offlineStorage.saveQuiz(offlineQuiz);
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.progress = 100;
        progress.status = "completed";
      }
      onProgress?.(100);
    } catch (error) {
      const progress = this.activeDownloads.get(downloadId);
      if (progress) {
        progress.status = "error";
        progress.error = error instanceof Error ? error.message : "Download failed";
      }
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadAll(
    lessonId: string,
    lessonData: unknown,
    notesContent?: string,
    quizData?: unknown,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const totalSteps = 3;
    let currentStep = 0;

    const updateProgress = (stepProgress: number) => {
      const overallProgress = Math.floor((currentStep * 100 + stepProgress) / totalSteps);
      onProgress?.(overallProgress);
    };

    try {
      await this.downloadLesson(lessonId, lessonData, updateProgress);
      currentStep++;
      if (notesContent) {
        await this.downloadNotes(lessonId, notesContent, updateProgress);
        currentStep++;
      } else {
        currentStep++;
      }
      if (quizData) {
        await this.downloadQuiz(lessonId, quizData, updateProgress);
        currentStep++;
      } else {
        currentStep++;
      }
      onProgress?.(100);
    } catch (error) {
      throw error;
    }
  }

  getDownloadProgress(lessonId: string, type: "lesson" | "notes" | "quiz"): DownloadProgress | undefined {
    return this.activeDownloads.get(`${lessonId}-${type}`);
  }

  async isLessonDownloaded(lessonId: string): Promise<boolean> {
    const lesson = await offlineStorage.getLesson(lessonId);
    return lesson !== null;
  }

  async areNotesDownloaded(lessonId: string): Promise<boolean> {
    const notes = await offlineStorage.getNotes(lessonId);
    return notes !== null;
  }

  async isQuizDownloaded(lessonId: string): Promise<boolean> {
    const quiz = await offlineStorage.getQuiz(lessonId);
    return quiz !== null;
  }

  async deleteLesson(lessonId: string): Promise<void> {
    await offlineStorage.deleteLesson(lessonId);
    this.activeDownloads.delete(`${lessonId}-lesson`);
  }

  async getStorageSize(): Promise<number> {
    return await offlineStorage.getStorageSize();
  }

  async getDownloadedLessons(): Promise<OfflineLesson[]> {
    return await offlineStorage.getAllLessons();
  }

  async saveOfflineProgress(
    lessonId: string,
    userId: string,
    completed: boolean,
    progress: number,
    quizScore?: number
  ): Promise<void> {
    const offlineProgress: OfflineProgress = {
      lessonId,
      userId,
      completed,
      progress,
      quizScore,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };

    await offlineStorage.saveProgress(offlineProgress);
  }

  async getOfflineProgress(lessonId: string, userId: string): Promise<OfflineProgress | null> {
    return await offlineStorage.getProgress(lessonId, userId);
  }

  async syncProgress(userId: string): Promise<void> {
    const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
    
    for (const progress of unsyncedProgress) {
      if (progress.userId !== userId) continue;

      try {
        await fetch("/api/learn/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: progress.lessonId,
            completed: progress.completed,
            progress: progress.progress,
            quizScore: progress.quizScore,
          }),
        });

        await offlineStorage.markProgressSynced(progress.lessonId, userId);
      } catch (error) {
        console.error("Failed to sync progress:", error);
        log.offlineSyncFailed({
          userId,
          operation: "syncProgress",
          table: "learn_lessons_progress",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export const downloadManager = new DownloadManager();