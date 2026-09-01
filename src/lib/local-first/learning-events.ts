import type { LearningEvent } from "@/lib/intelligence/learningEvents";
import { localFirstStore } from "./store";

/** Durable device ledger for learning evidence. The event is immutable: replaying the same
 * source identity returns the existing record instead of creating another reward event. */
export async function recordLearningEventLocally(event: LearningEvent) {
  if (!event.userId || !event.eventId || !event.sourceEventId) {
    throw new Error("Learning event requires an authenticated user and stable identity");
  }
  const id = `learning-event:${event.eventId}`;
  const existing = await localFirstStore.get<LearningEvent>(id);
  if (existing?.userId === event.userId && !existing.deletedAt) return existing;
  if (existing && existing.userId !== event.userId) throw new Error("Refusing cross-account learning event access");
  return localFirstStore.upsert({ id, entity: "learning_event", entityId: event.eventId, userId: event.userId, payload: event });
}

export async function listLocalLearningEvents(userId: string, limit = 200): Promise<LearningEvent[]> {
  if (!userId) return [];
  const records = await localFirstStore.list(userId);
  return records
    .filter(record => record.entity === "learning_event" && !record.deletedAt && record.payload?.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Math.max(1, Math.min(limit, 1000)))
    .map(record => record.payload as LearningEvent);
}

export async function getLocalLearningEvent(userId: string, eventId: string): Promise<LearningEvent | null> {
  if (!userId || !eventId) return null;
  const record = await localFirstStore.get<LearningEvent>(`learning-event:${eventId}`);
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}
