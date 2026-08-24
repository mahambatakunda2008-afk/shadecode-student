export type EvaluationDecision = "promote" | "iterate" | "reject";

export interface EvaluationMetrics {
  learningOutcome: number;
  correctness: number;
  retention: number;
  accessibility: number;
  costEfficiency: number;
  engagement: number;
}

export type EvaluationThresholds = EvaluationMetrics;

export interface EvaluationResult {
  decision: EvaluationDecision;
  score: number;
  failedGates: string[];
  reasons: string[];
}

const KEYS: Array<keyof EvaluationMetrics> = [
  "learningOutcome", "correctness", "retention", "accessibility", "costEfficiency", "engagement",
];

function valid(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function evaluateExperiment(metrics: EvaluationMetrics, thresholds: EvaluationThresholds): EvaluationResult {
  const invalidMetrics = KEYS.filter((key) => !valid(metrics[key])).map((key) => `metric:${key}`);
  const failedGates = invalidMetrics.length ? invalidMetrics : KEYS.filter((key) => metrics[key] < thresholds[key]).map((key) => `threshold:${key}`);
  const score = KEYS.reduce((sum, key) => sum + metrics[key], 0) / KEYS.length;
  const decision: EvaluationDecision = invalidMetrics.length ? "reject" : failedGates.length ? "iterate" : "promote";
  const reasons = invalidMetrics.length ? invalidMetrics : failedGates;
  return { decision, score, failedGates, reasons };
}
