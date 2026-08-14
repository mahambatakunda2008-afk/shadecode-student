import { calculateLearningUtility, type LearningCandidate, type LearningDecision, type LearningUtilityWeights } from "@/lib/learning-engine/shadecodeLearningUtility";
import { applyLearningEvents, type LearningEvent } from "./learningEvents";
import { createInitialLearningState, type TopicLearningState } from "./learningState";
import { evaluateCounterfactuals, type CounterfactualDecision } from "./counterfactualEngine";

export interface CortexTopicContext {
  state: TopicLearningState;
  decision: LearningDecision | null;
  counterfactuals: CounterfactualDecision;
}

/** Pure integration boundary for product code. No persistence or network side effects. */
export function buildCortexTopicContext(
  topicId: string,
  candidates: LearningCandidate[],
  events: LearningEvent[] = [],
  weights?: Partial<LearningUtilityWeights>,
): CortexTopicContext {
  const state = applyLearningEvents(createInitialLearningState(topicId), events);
  const counterfactuals = evaluateCounterfactuals(candidates, weights);
  return { state, decision: counterfactuals.chosen, counterfactuals };
}

/** Evaluate the selected candidate directly when a caller only needs the winner. */
export function chooseCortexMove(
  candidates: LearningCandidate[],
  weights?: Partial<LearningUtilityWeights>,
): LearningDecision | null {
  if (candidates.length === 0) return null;
  return calculateLearningUtility(candidates[0], weights);
}
