import type { EvaluationMetrics, EvaluationThresholds } from "./scoring";

export interface EvaluationFixture {
  id: string;
  description: string;
  baseline: EvaluationMetrics;
  candidate: EvaluationMetrics;
  thresholds: EvaluationThresholds;
}

const thresholds: EvaluationThresholds = {
  learningOutcome: 0.7,
  correctness: 0.9,
  retention: 0.6,
  accessibility: 0.7,
  costEfficiency: 0.5,
  engagement: 0.5,
};

export const CORTEX_EVALUATION_FIXTURES: readonly EvaluationFixture[] = [
  {
    id: "novice-prerequisite-gap",
    description: "Learner lacks a prerequisite and needs targeted support without replacing independent work.",
    baseline: { learningOutcome: 0.58, correctness: 0.72, retention: 0.48, accessibility: 0.82, costEfficiency: 0.72, engagement: 0.66 },
    candidate: { learningOutcome: 0.76, correctness: 0.93, retention: 0.67, accessibility: 0.84, costEfficiency: 0.68, engagement: 0.69 },
    thresholds,
  },
  {
    id: "careless-error",
    description: "Strong learner makes avoidable mistakes and benefits from precise verification.",
    baseline: { learningOutcome: 0.74, correctness: 0.84, retention: 0.71, accessibility: 0.86, costEfficiency: 0.76, engagement: 0.72 },
    candidate: { learningOutcome: 0.82, correctness: 0.94, retention: 0.76, accessibility: 0.87, costEfficiency: 0.74, engagement: 0.73 },
    thresholds,
  },
  {
    id: "high-confidence-weak-evidence",
    description: "Learner reports confidence that is not supported by demonstrated performance.",
    baseline: { learningOutcome: 0.62, correctness: 0.79, retention: 0.51, accessibility: 0.83, costEfficiency: 0.74, engagement: 0.78 },
    candidate: { learningOutcome: 0.71, correctness: 0.91, retention: 0.62, accessibility: 0.84, costEfficiency: 0.70, engagement: 0.77 },
    thresholds,
  },
  {
    id: "intermittent-connectivity",
    description: "Learner needs useful progress and recommendations despite unreliable connectivity.",
    baseline: { learningOutcome: 0.63, correctness: 0.88, retention: 0.58, accessibility: 0.49, costEfficiency: 0.71, engagement: 0.55 },
    candidate: { learningOutcome: 0.73, correctness: 0.91, retention: 0.65, accessibility: 0.74, costEfficiency: 0.77, engagement: 0.59 },
    thresholds,
  },
] as const;
