import type { SupabaseClient } from "@supabase/supabase-js";
import { learningEventToObservation } from "@/lib/intelligence/learningObservation";
import type { LearningEvent } from "@/lib/intelligence/learningEvents";

function subjectForEvent(event: LearningEvent): string | null {
  const subjectId = event.subjectId?.trim() ?? "";
  const subject = typeof event.metadata.subject === "string" ? event.metadata.subject.trim() : "";
  return subject || subjectId || null;
}

/**
 * Atomically projects one canonical event into topic_mastery.
 *
 * The database function owns both idempotency and the read/modify/write
 * transition under a per-learner/topic transaction lock. Keeping the
 * transition in Postgres prevents concurrent answers from overwriting one
 * another and makes retries safe after an ambiguous network response.
 */
export async function projectLearningEvent(
  supabase: SupabaseClient,
  event: LearningEvent,
): Promise<{ projected: boolean; reason?: string }> {
  const observation = learningEventToObservation(event);
  if (!observation) return { projected: false, reason: "no-topic-observation" };

  const subject = subjectForEvent(event);
  if (!observation.topicId.trim() || !subject || !event.eventId.trim() || !event.userId.trim()) {
    return { projected: false, reason: "missing-projection-identity" };
  }

  const evidenceScore = observation.evidenceScore ?? (observation.correct ? 100 : 0);
  const { data, error } = await supabase.rpc("project_canonical_learning_observation", {
    p_user_id: event.userId,
    p_event_id: event.eventId,
    p_subject: subject,
    p_topic: observation.topicId.trim(),
    p_syllabus_id: event.syllabusId ?? null,
    p_curriculum_topic_key: null,
    p_evidence_score: evidenceScore,
    p_correct: observation.correct,
    p_confidence: observation.confidence ?? null,
    p_response_seconds: observation.responseSeconds ?? null,
    p_observed_at: observation.observedAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  if (data === true) return { projected: true };
  return { projected: false, reason: "already-projected" };
}
