import type { SupabaseClient } from "@supabase/supabase-js";

export type LearnerBrainEventType =
  | "request"
  | "lesson_completed"
  | "generation_failed"
  | "checkpoint_answered"
  | "help_requested"
  | "feedback";

export type LearnerBrainSignal = {
  subject: string;
  topic: string;
  topic_key: string;
  event_type: LearnerBrainEventType;
  outcome?: string;
  difficulty?: "easy" | "medium" | "hard";
  metadata?: Record<string, unknown>;
};

export function normalizeLearnerTopic(subject: string, topic: string): string {
  const normalizePart = (value: string) => value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${normalizePart(subject)}|${normalizePart(topic)}`.slice(0, 240);
}

export async function rememberLearnerSignal(
  supabase: SupabaseClient,
  userId: string,
  signal: LearnerBrainSignal,
): Promise<void> {
  const row = {
    user_id: userId,
    subject: signal.subject.trim().slice(0, 120),
    topic: signal.topic.trim().slice(0, 240),
    topic_key: signal.topic_key || normalizeLearnerTopic(signal.subject, signal.topic),
    event_type: signal.event_type,
    outcome: (signal.outcome ?? "").slice(0, 120),
    difficulty: signal.difficulty ?? "medium",
    metadata: signal.metadata ?? {},
  };
  const { error } = await supabase.from("learner_brain_events").insert(row);
  if (error) {
    // Memory is an enhancement, never a hard dependency for opening Learn.
    console.warn("[LEARN_BRAIN] memory write skipped", { eventType: signal.event_type, error: error.message });
  }
}

export async function buildLearnerBrainContext(
  supabase: SupabaseClient,
  userId: string,
  subject: string,
  topic: string,
): Promise<string> {
  const topicKey = normalizeLearnerTopic(subject, topic);
  const { data, error } = await supabase
    .from("learner_brain_events")
    .select("subject,topic,event_type,outcome,difficulty,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !Array.isArray(data) || data.length === 0) return "";

  const current = data.filter((row) =>
    normalizeLearnerTopic(String(row.subject ?? ""), String(row.topic ?? "")) === topicKey,
  ).slice(0, 8);
  const recentTopics = [...new Map(
    data.filter((row) => row.event_type === "request")
      .map((row) => [normalizeLearnerTopic(String(row.subject ?? ""), String(row.topic ?? "")), row]),
  ).values()].slice(0, 8);

  const lines = [
    "LEARNER MEMORY (private to this signed-in learner; signals from their other devices):",
    current.length
      ? `History for this topic: ${current.map((row) => `${row.event_type}${row.outcome ? ` (${row.outcome})` : ""}, difficulty ${row.difficulty}`).join("; ")}.`
      : "This is the first recorded session for this exact topic.",
    recentTopics.length
      ? `Recently requested topics: ${recentTopics.map((row) => `${String(row.subject)}: ${String(row.topic)}`).join(" | ")}.`
      : "",
    "Personalization rules: connect to relevant prior topics where helpful; adapt explanation depth to observed difficulty and outcomes; do not assume mastery from a request alone; do not reveal or invent personal details; never let memory override factual accuracy or the requested syllabus.",
  ].filter(Boolean);

  return lines.join("\n").slice(0, 1800);
}

export function inferLearningOutcome(
  score: number,
): "needs_support" | "developing" | "strong" {
  if (!Number.isFinite(score) || score < 0.5) return "needs_support";
  if (score < 0.8) return "developing";
  return "strong";
}
