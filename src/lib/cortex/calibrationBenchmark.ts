import { calibrateWeights, evaluateWeights, type CalibrationExample, type CalibrationResult, type CalibrationWeights } from "./calibrationEngine";

export interface CalibrationBenchmarkResult {
  baseline: CalibrationResult;
  calibrated: CalibrationResult;
  improvement: number;
  trainCount: number;
  holdoutCount: number;
}

function splitExamples(examples: CalibrationExample[], holdoutFraction: number): [CalibrationExample[], CalibrationExample[]] {
  if (examples.length < 4) {
    throw new Error("Calibration benchmark requires at least 4 examples");
  }

  const fraction = Math.max(0.2, Math.min(0.5, holdoutFraction));
  const holdoutCount = Math.max(1, Math.floor(examples.length * fraction));
  const train = examples.slice(0, examples.length - holdoutCount);
  const holdout = examples.slice(examples.length - holdoutCount);
  return [train, holdout];
}

/**
 * Calibrate on one deterministic partition and score only on unseen examples.
 * This is the minimum guard against celebrating an optimizer that only learned
 * the reviewed examples it was given.
 */
export function runCalibrationBenchmark(
  initial: CalibrationWeights,
  examples: CalibrationExample[],
  holdoutFraction = 0.25,
  step = 0.1,
): CalibrationBenchmarkResult {
  const [train, holdout] = splitExamples(examples, holdoutFraction);
  const calibrated = calibrateWeights(initial, train, step);
  const baseline = evaluateWeights(initial, holdout);
  const calibratedHoldout = evaluateWeights(calibrated.weights, holdout);

  return {
    baseline,
    calibrated: calibratedHoldout,
    improvement: calibratedHoldout.score - baseline.score,
    trainCount: train.length,
    holdoutCount: holdout.length,
  };
}
