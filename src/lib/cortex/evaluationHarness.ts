import { chooseNextLearningMove, type LearningCandidate, type LearningDecision } from "@/lib/learning-engine/shadecodeLearningUtility";
import { applyLearningEvents, type LearningEvent } from "./learningEvents";
import { createInitialLearningState } from "./learningState";

export interface EvaluationScenario {
  id: string;
  topicId: string;
  candidates: LearningCandidate[];
  events: LearningEvent[];
}

export interface EvaluationResult {
  scenarioId: string;
  decision: LearningDecision | null;
  finalMastery: number;
  finalUncertainty: number;
}

export function runEvaluationScenario(scenario: EvaluationScenario): EvaluationResult {
  const decision = chooseNextLearningMove(scenario.candidates);
  const finalState = applyLearningEvents(
    createInitialLearningState(scenario.topicId),
    scenario.events,
  );

  return {
    scenarioId: scenario.id,
    decision,
    finalMastery: finalState.mastery,
    finalUncertainty: finalState.uncertainty,
  };
}

export function runEvaluationSuite(scenarios: EvaluationScenario[]): EvaluationResult[] {
  return scenarios.map(runEvaluationScenario);
}
