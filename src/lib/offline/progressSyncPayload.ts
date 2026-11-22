export function buildProgressSyncPayload(payload: unknown, lessonId: string, userId: string): Record<string, unknown> {
  if (!lessonId || !userId) throw new Error("Lesson progress requires a lesson and authenticated user");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Lesson progress payload is invalid");
  const progress = (payload as Record<string, unknown>).progress;
  if (typeof progress !== "number" || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new Error("Lesson progress must be an integer from 0 to 100");
  }
  return { sync_kind: "progress", progress, id: lessonId, user_id: userId };
}
