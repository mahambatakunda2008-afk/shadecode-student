import {
  chooseNextLearningMove,
  type LearningCandidate,
  type LearningUtilityWeights,
} from "@/lib/learning-engine/shadecodeLearningUtility";

export type CalibrationWeights = LearningUtilityWeights;

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
 * Small deterministic coordinate search around a baseline multiplier set.
 * Each multiplier is bounded so calibration cannot silently create runaway
 * influence. A change is retained only when it improves reviewed-example score.
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
      const candidate: CalibrationWeights = {
        ...best.weights,
        [key]: clamp(best.weights[key] + direction * delta),
      };
      const result = evaluateWeights(candidate, examples);
      if (result.score > best.score) best = result;
    }
  }

  return best;
}
