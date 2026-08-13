/**
 * Shadecode Learning Utility (SLU) v1
 *
 * A deterministic, model-independent decision function for choosing the
 * highest-value learning move for a student.
 *
 * This is intentionally not presented as a scientifically validated learning
 * model. It is Shadecode-owned decision infrastructure: transparent,
 * testable, cheap to run locally/offline, and designed to become data-driven
 * as real outcome data accumulates.
 */

export type LearningMoveType = "lesson" | "revision" | "exam" | "practice" | "review";

export interface LearningCandidate {
  id: string;
  type: LearningMoveType;
  mastery: number; // 0-100
  retentionRisk: number; // 0-100
  examUrgency: number; // 0-100
  prerequisiteValue: number; // 0-100
  goalAlignment: number; // 0-100
  curriculumGap: number; // 0-100
  trendRisk: number; // 0-100, higher = performance is becoming less stable
  uncertainty: number; // 0-100, higher = less evidence about the student's state
  momentum: number; // 0-100, recent engagement/progress signal
  estimatedMinutes: number;
}

export interface LearningUtilityBreakdown {
  masteryGap: number;
  need: number;
  opportunity: number;
  costPenalty: number;
  utility: number;
  explorationBonus: number;
}

export interface LearningDecision {
  candidate: LearningCandidate;
  score: number; // 0-100
  breakdown: LearningUtilityBreakdown;
  reason: string;
}

/** Multipliers around the v1 baseline. 1 = unchanged baseline influence. */
export interface LearningUtilityWeights {
  masteryGap: number;
  retentionRisk: number;
  examUrgency: number;
  prerequisiteValue: number;
  goalAlignment: number;
  curriculumGap: number;
  trendRisk: number;
  uncertainty: number;
  momentum: number;
}

export const DEFAULT_LEARNING_UTILITY_WEIGHTS: LearningUtilityWeights = {
  masteryGap: 1,
  retentionRisk: 1,
  examUrgency: 1,
  prerequisiteValue: 1,
  goalAlignment: 1,
  curriculumGap: 1,
  trendRisk: 1,
  uncertainty: 1,
  momentum: 1,
};

const BASE_NEED_WEIGHTS = {
  masteryGap: 0.30,
  retentionRisk: 0.25,
  examUrgency: 0.20,
  trendRisk: 0.15,
  prerequisiteValue: 0.10,
} as const;

const BASE_OPPORTUNITY_WEIGHTS = {
  goalAlignment: 0.45,
  curriculumGap: 0.25,
  uncertainty: 0.20,
  momentum: 0.10,
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function weighted(
  values: Record<string, number>,
  baseWeights: Record<string, number>,
  multipliers: LearningUtilityWeights,
): number {
  let numerator = 0;
  let denominator = 0;

  for (const key of Object.keys(baseWeights)) {
    const multiplier = Math.max(0, Number(multipliers[key as keyof LearningUtilityWeights]) || 0);
    const weight = baseWeights[key] * multiplier;
    numerator += clamp(values[key]) * weight;
    denominator += weight;
  }

  return denominator > 0 ? numerator / denominator : 0;
}

function normalizeWeights(weights?: Partial<LearningUtilityWeights>): LearningUtilityWeights {
  return {
    ...DEFAULT_LEARNING_UTILITY_WEIGHTS,
    ...weights,
  };
}

/**
 * Calculates Shadecode's transparent learning-utility score.
 *
 * Need asks "why does this student need this now?".
 * Opportunity asks "how much useful learning signal is available here?".
 * Cost prevents a long intervention from automatically winning over a
 * shorter, high-value intervention.
 */
export function calculateLearningUtility(
  candidate: LearningCandidate,
  weights?: Partial<LearningUtilityWeights>,
): LearningDecision {
  const effectiveWeights = normalizeWeights(weights);
  const masteryGap = 100 - clamp(candidate.mastery);

  const need = weighted(
    {
      masteryGap,
      retentionRisk: candidate.retentionRisk,
      examUrgency: candidate.examUrgency,
      trendRisk: candidate.trendRisk,
      prerequisiteValue: candidate.prerequisiteValue,
    },
    BASE_NEED_WEIGHTS,
    effectiveWeights,
  );

  const opportunity = weighted(
    {
      goalAlignment: candidate.goalAlignment,
      curriculumGap: candidate.curriculumGap,
      uncertainty: candidate.uncertainty,
      momentum: candidate.momentum,
    },
    BASE_OPPORTUNITY_WEIGHTS,
    effectiveWeights,
  );

  const minutes = Math.max(
    5,
    Number.isFinite(candidate.estimatedMinutes) ? candidate.estimatedMinutes : 15,
  );
  const costPenalty = 1 + Math.log2(minutes / 15 + 1) * 0.35;

  // Exploration is deliberately bounded so uncertainty cannot overwhelm
  // genuine need, while still allowing under-observed topics to be explored.
  const explorationBonus = clamp(candidate.uncertainty) * 0.08 * effectiveWeights.uncertainty;

  const rawUtility = ((need * 0.65) + (opportunity * 0.35)) / costPenalty;
  const score = Math.round(clamp(rawUtility + explorationBonus));

  return {
    candidate,
    score,
    breakdown: {
      masteryGap: Math.round(masteryGap),
      need: Math.round(need),
      opportunity: Math.round(opportunity),
      costPenalty: Number(costPenalty.toFixed(3)),
      utility: Math.round(clamp(rawUtility)),
      explorationBonus: Number(explorationBonus.toFixed(2)),
    },
    reason: buildReason(candidate, need, opportunity, score),
  };
}

/**
 * Picks the next-best learning move from a candidate set.
 * Stable tie-breaking prefers shorter interventions, then higher need.
 */
export function chooseNextLearningMove(
  candidates: LearningCandidate[],
  weights?: Partial<LearningUtilityWeights>,
): LearningDecision | null {
  if (candidates.length === 0) return null;

  return candidates
    .map((candidate) => calculateLearningUtility(candidate, weights))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidate.estimatedMinutes !== b.candidate.estimatedMinutes) {
        return a.candidate.estimatedMinutes - b.candidate.estimatedMinutes;
      }
      return b.breakdown.need - a.breakdown.need;
    })[0];
}

function buildReason(
  candidate: LearningCandidate,
  need: number,
  opportunity: number,
  score: number,
): string {
  const signals: string[] = [];
  if (100 - clamp(candidate.mastery) >= 60) signals.push("a large mastery gap");
  if (candidate.retentionRisk >= 60) signals.push("high retention risk");
  if (candidate.examUrgency >= 70) signals.push("an approaching assessment");
  if (candidate.trendRisk >= 60) signals.push("a declining performance trend");
  if (candidate.prerequisiteValue >= 70) signals.push("strong prerequisite value");

  const lead =
    signals.length > 0
      ? signals.slice(0, 2).join(" and ")
      : "the strongest overall learning utility";

  return `Selected because of ${lead}; need=${Math.round(need)}/100, opportunity=${Math.round(opportunity)}/100, utility=${score}/100.`;
}
