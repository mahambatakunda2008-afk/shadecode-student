// src/lib/cortex.ts

import type { CortexEvent, CortexEventInput, CortexSnapshot } from "../types";

const eventStore: CortexEvent[] = [];

function toEvent(input: CortexEventInput): CortexEvent {
  return { id: input.id ?? crypto.randomUUID(), userId: input.userId, type: input.type, source: input.source, createdAt: new Date().toISOString(), data: input.data };
}

export function emitCortexEvent(input: CortexEventInput): CortexEvent {
  const event = toEvent(input); eventStore.push(event); return event;
}

export async function emitCortexEventDurable(input: CortexEventInput): Promise<CortexEvent> {
  const event = toEvent(input);
  const { createServerClient } = await import("./supabaseClient");
  const supabase = createServerClient();
  const { error } = await supabase.from("cortex_events").insert({ id: event.id, user_id: event.userId, type: event.type, source: event.source, data: event.data ?? {}, created_at: event.createdAt });

  if (error) {
    // A replayed offline event uses the same id. Treat an existing matching
    // record as an acknowledgement so XP/streak consumers never double-count it.
    const duplicate = await supabase.from("cortex_events").select("id,user_id,type,source,created_at,data").eq("id", event.id).eq("user_id", event.userId).maybeSingle();
    if (!duplicate.error && duplicate.data) {
      return { id: duplicate.data.id, userId: duplicate.data.user_id, type: duplicate.data.type, source: duplicate.data.source, createdAt: duplicate.data.created_at, data: duplicate.data.data ?? {} };
    }
    console.error("Failed to persist Cortex event:", error);
    throw new Error("Cortex event persistence failed");
  }
  return event;
}

function snapshotFromEvents(userEvents: CortexEvent[]): CortexSnapshot {
  const tasks = userEvents.filter((e) => e.type.includes("task"));
  const completed = tasks.filter((e) => e.type === "task.completed");
  return { streak: 0, level: Math.max(1, Math.floor((completed.length * 10) / 100) + 1), xp: completed.length * 10, totalTasks: tasks.length, completedTasks: completed.length, pendingTasks: Math.max(0, tasks.length - completed.length), subjects: [], recentTaskTitles: [] };
}

export function buildSnapshot(userId: string): CortexSnapshot { return snapshotFromEvents(eventStore.filter((e) => e.userId === userId)); }

export async function buildDurableSnapshot(userId: string): Promise<CortexSnapshot> {
  const { createServerClient } = await import("./supabaseClient");
  const supabase = createServerClient();
  const { data, error } = await supabase.from("cortex_events").select("id,user_id,type,source,created_at,data").eq("user_id", userId).order("created_at", { ascending: false }).limit(500);
  if (error) { console.error("Failed to load Cortex events:", error); return buildSnapshot(userId); }
  return snapshotFromEvents((data ?? []).map((row) => ({ id: row.id, userId: row.user_id, type: row.type, source: row.source, createdAt: row.created_at, data: row.data ?? {} })));
}

export async function generateInsight(prompt: string): Promise<string> { return `Cortex Insight: ${prompt.slice(0, 120)}...`; }

export async function recordCortexInsight(userId: string, eventType: string, eventData: Record<string, unknown> = {}) {
  if (!userId || !eventType) return;
  const { createServerClient } = await import("./supabaseClient"); const supabase = createServerClient();
  let insightText: string;
  switch (eventType) {
    case "task_completed": insightText = `You completed a task titled '${eventData.title || "an unnamed task"}'.`; break;
    case "subject_created": insightText = `You added a new study subject: '${eventData.name || "an unnamed subject"}'.`; break;
    case "daily_challenge_completed": insightText = `You successfully completed today's daily challenge, earning XP.`; break;
    default: insightText = `Observed a new activity of type: ${eventType}.`;
  }
  try { const { error } = await supabase.from("cortex_insights").insert({ user_id: userId, insight: insightText }); if (error) console.error("Error inserting insight:", error); }
  catch (err) { console.error("Exception during insight generation:", err); }
}

export async function updateCortexFromExam(params: { userId: string; subject: string; score: number; maxScore: number; eventId?: string }) {
  if (!params.userId || !params.subject || params.maxScore <= 0) throw new Error("Invalid exam data for Cortex update");
  const percentage = Math.round((params.score / params.maxScore) * 100);
  await emitCortexEventDurable({ id: params.eventId, userId: params.userId, type: "exam.completed", source: "exam", data: { subject: params.subject, score: params.score, maxScore: params.maxScore, percentage } });
  const snapshot = await buildDurableSnapshot(params.userId);
  const insight = await generateInsight(`Student scored ${percentage}% in ${params.subject}. Analyze weaknesses and learning direction.`);
  return { snapshot, insight };
}
