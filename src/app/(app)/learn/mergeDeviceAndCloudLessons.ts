import type { LearnLesson } from "./types";
import type { OfflineLesson } from "@/lib/offline/storage";

/** Merge server metadata with device content without dropping local-only lessons or downloaded blocks. */
export function mergeDeviceAndCloudLessons(cloudLessons: LearnLesson[], deviceLessons: OfflineLesson[]): LearnLesson[] {
  const merged = new Map<string, LearnLesson>();
  for (const lesson of deviceLessons) {
    if (!lesson?.id) continue;
    merged.set(lesson.id, {
      id: lesson.id, title: lesson.title, subject: lesson.subject, subjectId: "", topic: lesson.title,
      description: lesson.description ?? "",
      difficulty: lesson.difficulty === "hard" || lesson.difficulty === "medium" ? lesson.difficulty : "easy",
      progress: lesson.progress ?? 0, completed: lesson.completed ?? false,
      blocks: lesson.blocks as LearnLesson["blocks"], updated_at: lesson.lastSyncedAt,
    });
  }
  for (const lesson of cloudLessons) {
    if (!lesson?.id) continue;
    const cached = merged.get(lesson.id);
    merged.set(lesson.id, { ...cached, ...lesson, blocks: lesson.blocks ?? cached?.blocks });
  }
  return [...merged.values()].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}
