import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createInitialLearningState,
  projectTopicMastery,
  reduceLearningObservation,
} from "@/lib/cortex/learningState";
import { learningEventToObservation } from "@/lib/intelligence/learningObservation";
import type { LearningEvent } from "@/lib/intelligence/learningEvents";

function rowToLearningState(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    topicId: String(row.topic),
    mastery: Number(row.mastery_score) || 0,
    retention: Number(row.retention) || 0,
    confidence: Number(row.confidence) || 0,
    stability: Number(row.stability) || 0,
    exposure: Number(row.exposure) || 0,
    errorRate: Number(row.error_rate) || 0,
    responseSpeed: Number(row.response_speed) || 0,
    prerequisiteHealth: Number(row.prerequisite_health) || 0,
    recentImprovement: Number(row.recent_improvement) || 0,
    uncertainty: Number(row.uncertainty) || 0,
    lastObservedAt: typeof row.last_attempted === "string" ? row.last_attempted : undefined,
  };
}

function subjectForEvent(event: LearningEvent): string | null {
  const subjectId = event.subjectId?.trim() ?? "";
  const subject = typeof event.metadata.subject === "string" ? event.metadata.subject.trim() : "";
  return subject || subjectId || null;
}

async function releaseProjectionClaim(supabase: SupabaseClient, userId: string, markerId: string) {
  const { error } = await supabase
    .from("cortex_events")
    .delete()
    .eq("user_id", userId)
    .eq("type", "learning.mastery.projected")
    .eq("source", "intelligence-projection")
    .contains("data", { eventId: markerId });
  if (error) console.error("[learning-events] failed to release projection claim:", error);
}

/**
 * Projects one canonical event into the durable topic_mastery compatibility
 * projection. Events without an explicit topic are intentionally ignored: a
 * lesson/entity id is not a substitute for a curriculum concept.
 *
 * The canonical event remains the source of truth. This projection is a
 * rebuildable read model and is guarded by an idempotent projection marker.
 */
export async function projectLearningEvent(
  supabase: SupabaseClient,
  event: LearningEvent,
): Promise<{ projected: boolean; reason?: string }> {
  const observation = learningEventToObservation(event);
  if (!observation) return { projected: false, reason: "no-topic-observation" };

  const topicId = observation.topicId.trim();
  const subject = subjectForEvent(event);
  const eventId = event.eventId.trim();
  const userId = event.userId.trim();
  if (!topicId || !subject || !eventId || !userId) {
    return { projected: false, reason: "missing-projection-identity" };
  }

  const markerId = `learning-mastery:${eventId}`;
  const { error: claimError } = await supabase.from("cortex_events").insert({
    user_id: userId,
    type: "learning.mastery.projected",
    source: "intelligence-projection",
    data: {
      eventId: markerId,
      sourceEventId: markerId,
      sourceCanonicalEventId: eventId,
      topicId,
      subject,
      projectedAt: new Date().toISOString(),
    },
  });
  if (claimError) {
    if (claimError.code === "23505") return { projected: false, reason: "already-projected" };
    throw claimError;
  }

  try {
    const { data: existing, error: readError } = await supabase
      .from("topic_mastery")
      .select("topic, mastery_score, last_score, attempts, retention, confidence, stability, exposure, error_rate, response_speed, prerequisite_health, recent_improvement, uncertainty, last_attempted")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topicId)
      .maybeSingle();
    if (readError) throw readError;

    const previous = rowToLearningState(existing as Record<string, unknown> | null);
    const base = previous ?? createInitialLearningState(topicId);
    const next = reduceLearningObservation(base, observation);
    const evidenceScore = observation.evidenceScore ?? (observation.correct ? 100 : 0);
    const projection = projectTopicMastery(previous, next, evidenceScore, (Number(existing?.attempts) || 0) + 1);
    const lastAttempted = observation.observedAt ?? new Date().toISOString();

    const { error: writeError } = await supabase.from("topic_mastery").upsert({
      user_id: userId,
      subject,
      topic: topicId,
      ...projection,
      last_attempted: lastAttempted,
    }, { onConflict: "user_id,subject,topic" });
    if (writeError) throw writeError;
  } catch (error) {
    await releaseProjectionClaim(supabase, userId, markerId);
    throw error;
  }

  return { projected: true };
}
