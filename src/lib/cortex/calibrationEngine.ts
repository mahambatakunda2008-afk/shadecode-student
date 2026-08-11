import type { LearningCandidate } from "@/lib/learning-engine/shadecodeLearningUtility";
import { chooseNextLearningMove } from "@/lib/learning-engine/shadecodeLearningUtility";

export interface CalibrationWeights {
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

export interface CalibrationExample {
  candidates: LearningCandidate[];
  preferredCandidateId: string;
}

export interface CalibrationResult {
  weights: CalibrationWeights;
  score: number;
  correct: number;
  total: number;
}

const KEYS: (keyof CalibrationWeights)[] = [
  "masteryGap", "retentionRisk", "examUrgency", "prerequisiteValue", "goalAlignment",
  "curriculumGap", "trendRisk", "uncertainty", "momentum",
];

function clamp(value: number, min = 0, max = 2): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

/** Evaluate a weight set against reviewed examples. */
export function evaluateWeights(
  weights: CalibrationWeights,
  examples: CalibrationExample[],
): CalibrationResult {
  let correct = 0;
  for (const example of examples) {
    const decision = chooseNextLearningMove(example.candidates, weights);
    if (decision?.candidate.id === example.preferredCandidateId) correct += 1;
  }
  const total = examples.length;
  return { weights, correct, total, score: total ? correct / total : 0 };
}

/**
 * Small deterministic coordinate search. It explores only bounded perturbations
 * around the supplied weights and keeps a candidate only when it improves the
 * reviewed-example score. This is calibration, not autonomous truth discovery.
 */
export function calibrateWeights(
  initial: CalibrationWeights,
  examples: CalibrationExample[],
  step = 0.1,
): CalibrationResult {
  let best = evaluateWeights(initial, examples);
  const delta = Math.max(0.01, Math.min(0.25, step));

  for (const key of KEYS) {
    for (const direction of [1, -1]) {
      const candidate = {
        ...best.weights,
        [key]: clamp(best.weights[key] + direction * delta),
      };
      const result = evaluateWeights(candidate, examples);
      if (result.score > best.score) best = result;
    }
  }

  return best;
}
