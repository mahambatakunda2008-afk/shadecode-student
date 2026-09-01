/**
 * src/lib/topicMastery/blend.ts
 *
 * Compatibility projection for the production `topic_mastery` row.
 * The mastery score transition itself is shared with Cortex so exam results
 * and individual learning observations cannot drift into separate formulas.
 */

import { transitionMastery } from "@/lib/intelligence/masteryTransition";

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
 * Applies one graded topic percentage using the platform's shared EMA rule.
 * `trend` is the change caused by this evidence and remains useful to
 * downstream retention-risk logic.
 */
export function blendMastery(
  existing: ExistingMastery | null,
  newAttemptPercentage: number,
): MasteryUpdate {
  const mastery = transitionMastery(existing?.mastery_score ?? null, newAttemptPercentage);
  const lastScore = Math.max(0, Math.min(100, Number.isFinite(newAttemptPercentage) ? newAttemptPercentage : 0));

  return {
    mastery_score: mastery,
    last_score: lastScore,
    attempts: (existing?.attempts ?? 0) + 1,
    trend: existing ? mastery - existing.mastery_score : 0,
  };
}
