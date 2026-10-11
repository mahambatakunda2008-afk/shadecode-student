/**
 * src/lib/topicMastery/record.ts
 *
 * One place that writes a keyed topic_mastery row (and optionally queues the
 * topic for revision). Used by revision decks and engine practice so the
 * projection, the exact curriculum key and the queue rules cannot drift apart.
 */

import { projectPaperSignal, type PaperVerdict } from "./paperSignal";

interface Query {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null }>;
}

export interface MasteryClient {
  from(table: string): Query & {
    upsert(values: Record<string, unknown>, options: { onConflict: string }): PromiseLike<{ error: unknown }>;
  };
}

export interface KeyedMasteryInput {
  subject: string;
  /** Verified subsection title, used as the topic so rows from every feature merge. */
  topic: string;
  syllabusId: string;
  topicKey: string;
  verdict: PaperVerdict;
  /** 0-100 evidence overriding the verdict's default (softer self-assessment). */
  evidence?: number;
  /** When set, a not-fully-correct result queues the topic for revision under this source. */
  queueSource?: "syllabus_selfcheck" | "paper_learning";
}

const COLUMNS = "mastery_score, attempts, confidence, error_rate, exposure, retention, stability, response_speed, prerequisite_health";

export async function recordKeyedMastery(client: MasteryClient, userId: string, input: KeyedMasteryInput): Promise<{ mastery: number }> {
  const { data: existing } = await client
    .from("topic_mastery")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("subject", input.subject)
    .eq("topic", input.topic)
    .maybeSingle();

  const now = new Date().toISOString();
  const { row, revisionPriority } = projectPaperSignal(existing, input.verdict, now, input.evidence);

  const { error } = await client.from("topic_mastery").upsert(
    { user_id: userId, subject: input.subject, topic: input.topic, syllabus_id: input.syllabusId, curriculum_topic_key: input.topicKey, ...row },
    { onConflict: "user_id,subject,topic" },
  );
  if (error) throw error;

  if (input.queueSource && input.verdict !== "correct") {
    const { error: queueError } = await client.from("revision_queue").upsert(
      { user_id: userId, topic: input.topic, subject: input.subject, priority: revisionPriority, source: input.queueSource, last_seen: now },
      { onConflict: "user_id,topic,subject" },
    );
    if (queueError) console.error("[recordKeyedMastery queue]", queueError);
  }

  return { mastery: Math.round(row.mastery_score) };
}
