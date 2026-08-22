import type { WorkObject } from "./types";
import { saveWorkObject } from "./store";

export function lessonWorkObject(input: {
  lessonId: string;
  subject?: string;
  topic?: string;
  progress: number;
  createdAt?: string;
}): WorkObject {
  const now = input.createdAt ?? new Date().toISOString();
  return {
    id: `lesson:${input.lessonId}`,
    mode: "lesson",
    status: input.progress >= 100 ? "submitted" : "draft",
    lessonId: input.lessonId,
    subject: input.subject?.trim() || undefined,
    topic: input.topic?.trim() || undefined,
    marks: undefined,
    timeSpentMs: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export async function recordLessonEvidence(input: Parameters<typeof lessonWorkObject>[0]): Promise<WorkObject> {
  const work = lessonWorkObject(input);
  await saveWorkObject(work);
  return work;
}
