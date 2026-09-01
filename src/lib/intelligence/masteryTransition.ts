/**
 * Shared mastery transition.
 *
 * This is the single score-transition rule used by both Cortex learning
 * observations and the production topic_mastery exam projection. Keeping the
 * transition pure makes offline replay deterministic and prevents separate
 * mastery algorithms from drifting apart.
 *
 * The weighting is a deliberately simple EMA heuristic, not a validated
 * psychometric model. Calibration can happen later without changing callers.
 */

export const MASTERY_HISTORY_WEIGHT = 0.7;
export const MASTERY_EVIDENCE_WEIGHT = 0.3;

export function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function transitionMastery(
  previousMastery: number | null,
  evidenceScore: number,
): number {
  const evidence = clampMastery(evidenceScore);
  if (previousMastery == null) return evidence;

  const previous = clampMastery(previousMastery);
  return Math.round(
    previous * MASTERY_HISTORY_WEIGHT + evidence * MASTERY_EVIDENCE_WEIGHT,
  );
}

export function observationScore(correct: boolean): number {
  return correct ? 100 : 0;
}
