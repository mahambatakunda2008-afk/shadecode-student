import { calculateLearningUtility, type LearningCandidate, type LearningDecision, type LearningUtilityWeights } from "@/lib/learning-engine/shadecodeLearningUtility";

export interface CounterfactualAlternative {
  candidateId: string;
  score: number;
  rank: number;
  decision: LearningDecision;
}

export interface CounterfactualDecision {
  chosen: LearningDecision | null;
  alternatives: CounterfactualAlternative[];
  margin: number;
}

/** Preserve the complete ranked decision surface instead of discarding alternatives. */
export function evaluateCounterfactuals(
  candidates: LearningCandidate[],
  weights?: Partial<LearningUtilityWeights>,
): CounterfactualDecision {
  const decisions = candidates
    .map((candidate) => calculateLearningUtility(candidate, weights))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidate.estimatedMinutes !== b.candidate.estimatedMinutes) {
        return a.candidate.estimatedMinutes - b.candidate.estimatedMinutes;
      }
      return b.breakdown.need - a.breakdown.need;
    });

  const chosen = decisions[0] ?? null;
  const second = decisions[1];

  return {
    chosen,
    alternatives: decisions.map((decision, index) => ({
      candidateId: decision.candidate.id,
      score: decision.score,
      rank: index + 1,
      decision,
    })),
    margin: chosen && second ? chosen.score - second.score : chosen ? chosen.score : 0,
  };
}
