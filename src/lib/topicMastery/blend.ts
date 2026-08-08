/**
 * src/lib/topicMastery/blend.ts
 *
 * Pure logic for updating a topic_mastery row from a new exam attempt.
 *
 * Context: the `topic_mastery` table (user_id, subject, topic,
 * mastery_score, last_score, attempts, last_attempted, trend) has existed
 * in the schema with a real unique constraint (user_id, subject, topic)
 * since before this session, but had zero producers and zero consumers
 * anywhere in the codebase -- fully orphaned. This module is the producer
 * side: it decides how a topic's mastery_score should move given one more
 * graded attempt.
 */

export interface ExistingMastery {
  mastery_score: number;
  attempts: number;
}

export interface MasteryUpdate {
  mastery_score: number;
  last_score: number;
  attempts: number;
  trend: number;
}

/**
 * Blends a new attempt's percentage into an existing mastery_score using
 * a simple exponential moving average (70% history / 30% new attempt),
 * rather than overwriting outright -- a single bad exam shouldn't erase
 * a topic's established mastery, and a single lucky guess shouldn't
 * inflate it. Weights are a deliberately simple, honestly-labeled
 * heuristic, not a validated psychometric model.
 *
 * `trend` is the raw delta this attempt caused (positive = improving,
 * negative = declining) -- used downstream by retentionRisk.ts as an
 * extra risk signal for topics that are actively getting worse, not
 * just old.
 */
export function blendMastery(
  existing: ExistingMastery | null,
  newAttemptPercentage: number
): MasteryUpdate {
  const clampedNew = Math.max(0, Math.min(100, newAttemptPercentage));

  if (!existing) {
    return {
      mastery_score: clampedNew,
      last_score: clampedNew,
      attempts: 1,
      trend: 0, // no prior data to compare against yet
    };
  }

  const HISTORY_WEIGHT = 0.7;
  const NEW_ATTEMPT_WEIGHT = 0.3;
  const blended = Math.round(
    existing.mastery_score * HISTORY_WEIGHT + clampedNew * NEW_ATTEMPT_WEIGHT
  );

  return {
    mastery_score: blended,
    last_score: clampedNew,
    attempts: existing.attempts + 1,
    trend: blended - existing.mastery_score,
  };
}
