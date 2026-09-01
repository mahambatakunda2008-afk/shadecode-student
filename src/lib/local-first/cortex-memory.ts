import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";
import type { CortexUserMemory } from "@/lib/cortex/memory";

const recordId = (userId: string) => `cortex-memory:${userId}`;

function requireUser(userId: string): void {
  if (!userId?.trim()) throw new Error("Cortex memory requires an authenticated user");
}

/** Device copy of Cortex's durable learner state. It is safe to read offline. */
export async function getLocalCortexMemory(userId: string): Promise<CortexUserMemory | null> {
  requireUser(userId);
  const record = await localFirstStore.get<CortexUserMemory>(recordId(userId));
  if (!record || record.userId !== userId || record.deletedAt) return null;
  return record.payload;
}

/** Persist a complete learner-memory snapshot locally before any remote write. */
export async function saveLocalCortexMemory(userId: string, memory: CortexUserMemory): Promise<LocalRecord<CortexUserMemory>> {
  requireUser(userId);
  const normalized: CortexUserMemory = { ...memory, level: Math.max(1, Number.isFinite(memory.level) ? memory.level : 1), streak: Math.max(0, Number.isFinite(memory.streak) ? memory.streak : 0), xp: Math.max(0, Number.isFinite(memory.xp) ? memory.xp : 0), subjects: Array.isArray(memory.subjects) ? [...memory.subjects] : [], weakTopics: Array.isArray(memory.weakTopics) ? [...memory.weakTopics] : [], weakSubjects: Array.isArray(memory.weakSubjects) ? [...memory.weakSubjects] : [], frequentlyStudiedSubjects: Array.isArray(memory.frequentlyStudiedSubjects) ? [...memory.frequentlyStudiedSubjects] : [], strongSubjects: Array.isArray(memory.strongSubjects) ? [...memory.strongSubjects] : [], preferredStudyHours: Array.isArray(memory.preferredStudyHours) ? [...memory.preferredStudyHours] : [], examScores: Array.isArray(memory.examScores) ? [...memory.examScores] : [] };
  return localFirstStore.upsert({ id: recordId(userId), entity: "insight", entityId: recordId(userId), userId, payload: normalized });
}

/** Merge a server snapshot only when it is newer than the local record. */
export async function hydrateLocalCortexMemory(userId: string, memory: CortexUserMemory, updatedAt = Date.now()): Promise<void> {
  requireUser(userId);
  await localFirstStore.hydrate({ id: recordId(userId), entity: "insight", entityId: recordId(userId), userId, payload: memory, version: 0, updatedAt, deviceId: "server" });
}

export async function clearLocalCortexMemory(userId: string): Promise<void> {
  requireUser(userId);
  await localFirstStore.remove({ id: recordId(userId), entity: "insight", userId });
}
