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
  const invalidMetrics = METRIC_KEYS.filter((key) => !isFiniteMetric(metrics[key]));
  const invalidThresholds = METRIC_KEYS.filter(
    (key) => !isFiniteMetric(thresholds[key]),
  );

  if (invalidMetrics.length > 0 || invalidThresholds.length > 0) {
    const invalid = [
      ...invalidMetrics.map((key) => `metric:${key}`),
      ...invalidThresholds.map((key) => `threshold:${key}`),
    ];
    return {
      decision: "reject",
      score: 0,
      failedGates: invalid,
      reasons: [`Invalid evaluation values: ${invalid.join(", ")}`],
    };
  }

  const failedGates = METRIC_KEYS.filter(
    (key) => metrics[key] < thresholds[key],
  );

  const weightedScore =
    metrics.learningOutcome * 0.3 +
    metrics.correctness * 0.25 +
    metrics.retention * 0.15 +
    metrics.accessibility * 0.1 +
    metrics.costEfficiency * 0.1 +
    metrics.engagement * 0.1;

  const score = Number(weightedScore.toFixed(4));
  const hardGateFailure =
    metrics.learningOutcome < thresholds.learningOutcome ||
    metrics.correctness < thresholds.correctness;

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
