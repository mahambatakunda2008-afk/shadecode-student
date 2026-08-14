import { type LearningCandidate, type LearningDecision, type LearningUtilityWeights } from "@/lib/learning-engine/shadecodeLearningUtility";
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

/** Return the winner from the same ranked surface used by the full Cortex context. */
export function chooseCortexMove(
  candidates: LearningCandidate[],
  weights?: Partial<LearningUtilityWeights>,
): LearningDecision | null {
  return evaluateCounterfactuals(candidates, weights).chosen;
}
