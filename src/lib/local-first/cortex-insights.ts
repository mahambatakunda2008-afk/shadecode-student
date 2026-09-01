import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalCortexInsight {
  id: string;
  insight: string;
  created_at: string;
}

const key = (userId: string, id: string) => `insight:${userId}:${id}`;

function requireUser(userId: string) {
  if (!userId) throw new Error("Cortex insights require an authenticated user");
}

/** Device-first Cortex evidence. The network is not required to create or read an insight. */
export async function saveLocalCortexInsight(
  userId: string,
  insight: Omit<LocalCortexInsight, "id" | "created_at"> & { id?: string; created_at?: string }
): Promise<LocalRecord<LocalCortexInsight>> {
  requireUser(userId);
  const text = insight.insight.trim();
  if (!text) throw new Error("insight text is required");
  const id = insight.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return localFirstStore.upsert({
    id: key(userId, id),
    entity: "insight",
    entityId: id,
    userId,
    payload: { id, insight: text, created_at: insight.created_at ?? new Date().toISOString() },
  });
}

export async function listLocalCortexInsights(userId: string, limit = 100): Promise<LocalCortexInsight[]> {
  requireUser(userId);
  const records = (await localFirstStore.list(userId))
    .filter((record) => record.entity === "insight" && !record.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Math.max(1, Math.floor(limit)));
  return records.map((record) => record.payload as LocalCortexInsight);
}
