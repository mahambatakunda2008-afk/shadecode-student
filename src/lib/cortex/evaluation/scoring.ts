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
  const invalidThresholds = KEYS.filter((key) => !valid(thresholds[key])).map((key) => `threshold:${key}`);
  if (invalidMetrics.length || invalidThresholds.length) {
    const failedGates = [...invalidMetrics, ...invalidThresholds];
    return { decision: "reject", score: 0, failedGates, reasons: [`Invalid evaluation values: ${failedGates.join(", ")}`] };
  }

  const failedGates = KEYS.filter((key) => metrics[key] < thresholds[key]);
  const score = Number((
    metrics.learningOutcome * 0.30 + metrics.correctness * 0.25 + metrics.retention * 0.15 +
    metrics.accessibility * 0.10 + metrics.costEfficiency * 0.10 + metrics.engagement * 0.10
  ).toFixed(4));

  if (metrics.learningOutcome < thresholds.learningOutcome || metrics.correctness < thresholds.correctness) {
    return { decision: "reject", score, failedGates, reasons: ["Learning outcome and correctness are promotion gates.", ...failedGates.map((key) => `${key} is below its threshold.`)] };
  }
  if (failedGates.length === 0 && score >= 0.8) {
    return { decision: "promote", score, failedGates: [], reasons: ["All configured gates passed and the weighted score is strong."] };
  }
  return { decision: "iterate", score, failedGates, reasons: failedGates.length ? failedGates.map((key) => `${key} needs more evidence.`) : ["The experiment passed its gates but needs a stronger overall result."] };
}
