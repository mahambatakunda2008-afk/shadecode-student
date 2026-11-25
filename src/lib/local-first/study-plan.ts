import type { StudyPlan } from "@/lib/studyPlan/types";
import { localFirstStore } from "@/lib/local-first/store";

export interface LocalStudyPlanRecord {
  plan: StudyPlan;
  updatedAt: string;
}

export const studyPlanRecordId = (userId: string) => `study-plan:${userId}`;

export function isStudyPlanOwnedBy(plan: StudyPlan | null | undefined, userId: string): plan is StudyPlan {
  return Boolean(userId && plan && plan.userId === userId && plan.id && Array.isArray(plan.weeklySchedules));
}

export async function readLocalStudyPlan(userId: string): Promise<StudyPlan | null> {
  if (!userId) return null;
  const record = await localFirstStore.get<LocalStudyPlanRecord>(studyPlanRecordId(userId));
  if (!record || record.userId !== userId || record.entity !== "study_state" || record.deletedAt) return null;
  return isStudyPlanOwnedBy(record.payload?.plan, userId) ? record.payload.plan : null;
}

/** Cache a plan already returned by the authenticated server. This is a read-through cache, not a queued server mutation. */
export async function cacheStudyPlan(userId: string, plan: StudyPlan): Promise<void> {
  if (!userId || !isStudyPlanOwnedBy(plan, userId)) throw new Error("Study plan cache requires the authenticated owner");
  const id = studyPlanRecordId(userId);
  const existing = await localFirstStore.get<LocalStudyPlanRecord>(id);
  if (existing && existing.userId !== userId) throw new Error("Refusing to overwrite another user's study plan");
  await localFirstStore.hydrate({
    id,
    entity: "study_state",
    entityId: id,
    userId,
    payload: { plan, updatedAt: plan.updatedAt || new Date().toISOString() } satisfies LocalStudyPlanRecord,
    updatedAt: Date.parse(plan.updatedAt) || Date.now(),
    deviceId: existing?.deviceId ?? "server",
    version: (existing?.version ?? 0) + 1,
    syncVersion: existing?.syncVersion ?? 0,
  });
}

export async function clearLocalStudyPlan(userId: string): Promise<void> {
  if (!userId) return;
  const id = studyPlanRecordId(userId);
  const existing = await localFirstStore.get<LocalStudyPlanRecord>(id);
  if (!existing || existing.userId !== userId || existing.deletedAt) return;
  await localFirstStore.hydrate({
    ...existing,
    updatedAt: Date.now(),
    version: existing.version + 1,
    deletedAt: Date.now(),
  });
}
