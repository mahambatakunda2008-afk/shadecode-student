// src/lib/cortex.ts

import type {
  CortexEvent,
  CortexEventInput,
  CortexSnapshot,
  CortexAIRequestType,
  CortexAIResponse,
  CortexBehaviorInsightPayload,
  CortexBehaviorSummaryPayload,
} from "../types";

/* ─────────────────────────────────────────────
   SIMPLE IN-MEMORY EVENT STORE (replace with DB later)
───────────────────────────────────────────── */

const eventStore: CortexEvent[] = [];

/* ─────────────────────────────────────────────
   EVENT EMITTER (USED BY API ROUTES)
───────────────────────────────────────────── */

export function emitCortexEvent(input: CortexEventInput): CortexEvent {
  const event: CortexEvent = {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    source: input.source,
    createdAt: new Date().toISOString(),
    data: input.data,
  };

  eventStore.push(event);
  return event;
}

/* ─────────────────────────────────────────────
   SNAPSHOT BUILDER (LIGHTWEIGHT)
───────────────────────────────────────────── */

export function buildSnapshot(userId: string): CortexSnapshot {
  const userEvents = eventStore.filter(e => e.userId === userId);

  const tasks = userEvents.filter(e => e.type.includes("task"));
  const completed = tasks.filter(e => e.type === "task.completed");

  return {
    streak: 3,
    level: 1,
    xp: completed.length * 10,

    totalTasks: tasks.length,
    completedTasks: completed.length,
    pendingTasks: tasks.length - completed.length,

    subjects: [],
    recentTaskTitles: [],
  };
}

/* ─────────────────────────────────────────────
   AI INSIGHT GENERATOR (SAFE FALLBACK)
───────────────────────────────────────────── */

export async function generateInsight(prompt: string): Promise<string> {
  // SAFE fallback (prevents build/runtime failure)
  // later you can plug OpenAI/Gemini/Cloudflare here

  return `Cortex Insight: ${prompt.slice(0, 120)}...`;
}

/* ─────────────────────────────────────────────
   EXAM → CORTEX INTEGRATION PIPELINE
───────────────────────────────────────────── */

export async function updateCortexFromExam(params: {
  userId: string;
  subject: string;
  score: number;
  maxScore: number;
}) {
  const percentage = Math.round((params.score / params.maxScore) * 100);

  const snapshot = buildSnapshot(params.userId);

  emitCortexEvent({
    userId: params.userId,
    type: "exam.completed",
    source: "exam",
    data: {
      subject: params.subject,
      score: params.score,
      maxScore: params.maxScore,
      percentage,
    },
  });

  const insight = await generateInsight(
    `Student scored ${percentage}% in ${params.subject}. Analyze weaknesses and learning direction.`
  );

  return {
    snapshot,
    insight,
  };
}
