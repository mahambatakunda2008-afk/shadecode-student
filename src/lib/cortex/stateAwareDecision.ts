import type { LearningCandidate, LearningDecision } from "@/lib/learning-engine/shadecodeLearningUtility";
import { chooseNextLearningMove } from "@/lib/learning-engine/shadecodeLearningUtility";
import { learningStateToCandidate, type StateCandidateContext } from "./stateToUtility";

export interface StateAwareDecision {
  decision: LearningDecision | null;
  candidates: LearningCandidate[];
  source: "learning-state" | "no-candidates";
}

/**
 * Runs SLU directly from the evolving topic state.
 * No AI provider, database, or UI is required for this decision.
 */
export function chooseStateAwareLearningMove(contexts: StateCandidateContext[]): StateAwareDecision {
  const candidates = contexts.map(learningStateToCandidate);
  const decision = chooseNextLearningMove(candidates);

  return {
    decision,
    candidates,
    source: decision ? "learning-state" : "no-candidates",
  };
}
