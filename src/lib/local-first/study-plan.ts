import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";
import type { StudyPlan, StudyGoals } from "@/lib/studyPlan/types";

const key = (userId: string) => `study-plan:${userId}`;
function requireUser(userId: string) { if (!userId) throw new Error("Study plan requires an authenticated user"); }

/** Canonical local copy of the active plan. Generation may still use the server/AI when available. */
export async function saveLocalStudyPlan(userId: string, plan: StudyPlan): Promise<LocalRecord<StudyPlan>> {
  requireUser(userId);
  if (plan.userId !== userId) throw new Error("Study plan belongs to another account");
  if (!plan.id || !plan.goals?.subjects?.length) throw new Error("Study plan is incomplete");
  return localFirstStore.upsert({ id: key(userId), entity: "goal", entityId: plan.id, userId, payload: plan });
}

export async function getLocalStudyPlan(userId: string): Promise<StudyPlan | null> {
  requireUser(userId);
  const record = await localFirstStore.get<StudyPlan>(key(userId));
  return record?.userId === userId && !record.deletedAt && record.payload.isActive ? record.payload : null;
}

export async function saveLocalStudyGoals(userId: string, goals: StudyGoals): Promise<LocalRecord<StudyGoals>> {
  requireUser(userId);
  if (!goals.subjects.length) throw new Error("At least one subject is required");
  return localFirstStore.upsert({ id: `${key(userId)}:goals`, entity: "goal", entityId: `${userId}:goals`, userId, payload: goals });
}

export async function getLocalStudyGoals(userId: string): Promise<StudyGoals | null> {
  requireUser(userId);
  const record = await localFirstStore.get<StudyGoals>(`${key(userId)}:goals`);
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}
