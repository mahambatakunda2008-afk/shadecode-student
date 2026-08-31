import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalLesson {
  id: string;
  subjectId: string;
  subject: string;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  progress: number;
  completed: boolean;
  updated_at?: string;
}

export interface LocalLessonList {
  subjects: Array<{ id: string; name: string; lessonCount: number }>;
  lessons: LocalLesson[];
  summary: { currentXP: number; currentStreak: number; level: number; xpGoal: number } | null;
  cachedAt: string;
}

const cacheId = (userId: string) => `learn_cache:${userId}`;

function requireUser(userId: string): void {
  if (!userId) throw new Error("Lesson cache requires an authenticated user");
}

export async function getLessonCache(userId: string): Promise<LocalLessonList | null> {
  requireUser(userId);
  const record = await localFirstStore.get<LocalLessonList>(cacheId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function saveLessonCache(userId: string, data: Omit<LocalLessonList, "cachedAt">): Promise<LocalRecord<LocalLessonList>> {
  requireUser(userId);
  const lessons = data.lessons.map((lesson) => ({
    ...lesson,
    progress: Math.min(100, Math.max(0, Number.isFinite(lesson.progress) ? lesson.progress : 0)),
    completed: Boolean(lesson.completed),
  }));
  return localFirstStore.upsert({
    id: cacheId(userId),
    entity: "settings",
    userId,
    payload: { ...data, lessons, cachedAt: new Date().toISOString() },
  });
}

export async function clearLessonCache(userId: string): Promise<void> {
  requireUser(userId);
  await localFirstStore.remove({ id: cacheId(userId), entity: "settings", userId });
}
