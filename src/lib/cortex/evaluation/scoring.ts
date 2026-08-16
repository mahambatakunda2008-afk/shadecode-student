export type EvaluationDecision = "promote" | "iterate" | "reject";

export interface EvaluationMetrics {
  learningOutcome: number;
  correctness: number;
  retention: number;
  accessibility: number;
  costEfficiency: number;
  engagement: number;
}

export interface EvaluationThresholds {
  learningOutcome: number;
  correctness: number;
  retention: number;
  accessibility: number;
  costEfficiency: number;
  engagement: number;
}

export interface EvaluationResult {
  decision: EvaluationDecision;
  score: number;
  failedGates: string[];
  reasons: string[];
}

const METRIC_KEYS: Array<keyof EvaluationMetrics> = [
  "learningOutcome",
  "correctness",
  "retention",
  "accessibility",
  "costEfficiency",
  "engagement",
];

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isFiniteMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Scores an experiment without depending on a database, model provider, or UI.
 * Learning outcome and correctness are hard gates because engagement alone
 * must never justify promotion of a learning intervention.
 */
export function evaluateExperiment(
  metrics: EvaluationMetrics,
  thresholds: EvaluationThresholds,
): EvaluationResult {
  const invalid = METRIC_KEYS.filter((key) => !isFiniteMetric(metrics[key]));
  if (invalid.length > 0) {
    return {
      decision: "reject",
      score: 0,
      failedGates: invalid,
      reasons: [`Invalid metric values: ${invalid.join(", ")}`],
    };
  }

  const failedGates = METRIC_KEYS.filter(
    (key) => metrics[key] < clamp(thresholds[key]),
  );

  const weightedScore =
    metrics.learningOutcome * 0.30 +
    metrics.correctness * 0.25 +
    metrics.retention * 0.15 +
    metrics.accessibility * 0.10 +
    metrics.costEfficiency * 0.10 +
    metrics.engagement * 0.10;

  const score = Number(weightedScore.toFixed(4));
  const hardGateFailure =
    metrics.learningOutcome < clamp(thresholds.learningOutcome) ||
    metrics.correctness < clamp(thresholds.correctness);

  if (hardGateFailure) {
    return {
      decision: "reject",
      score,
      failedGates,
      reasons: [
        "Learning outcome and correctness are promotion gates.",
        ...failedGates.map((key) => `${key} is below its threshold.`),
      ],
    };
  }

  if (failedGates.length === 0 && score >= 0.8) {
    return {
      decision: "promote",
      score,
      failedGates: [],
      reasons: ["All configured gates passed and the weighted score is strong."],
    };
  }

  return {
    decision: "iterate",
    score,
    failedGates,
    reasons: failedGates.length
      ? failedGates.map((key) => `${key} needs more evidence.`)
      : ["The experiment passed its gates but needs a stronger overall result."],
  };
}
