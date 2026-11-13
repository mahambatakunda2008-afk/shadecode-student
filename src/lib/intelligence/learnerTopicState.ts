export type MasteryState = "unobserved" | "developing" | "struggling" | "demonstrated";
export type LearningTrajectory = "improving" | "steady" | "declining" | "unknown";

export interface LearnerTopicStateInput {
  attempts: number;
  masteryScore: number | null;
  errorRate: number | null;
  recentImprovement: number | null;
  uncertainty: number | null;
}

export interface LearnerTopicState {
  mastery: MasteryState;
  trajectory: LearningTrajectory;
  evidenceStrength: "none" | "limited" | "moderate" | "strong";
  evidenceCount: number;
  confidence: number | null;
  rationale: string[];
}

/**
 * Deterministic, evidence-labelled learner state. These are operational
 * heuristics, not psychometric diagnoses. Missing evidence remains unobserved.
 */
export function deriveLearnerTopicState(input: LearnerTopicStateInput): LearnerTopicState {
  const attempts = Math.max(0, Math.floor(Number.isFinite(input.attempts) ? input.attempts : 0));
  const mastery = typeof input.masteryScore === "number" && Number.isFinite(input.masteryScore)
    ? Math.max(0, Math.min(100, input.masteryScore))
    : null;
  const errorRate = typeof input.errorRate === "number" && Number.isFinite(input.errorRate)
    ? Math.max(0, Math.min(100, input.errorRate))
    : null;
  const improvement = typeof input.recentImprovement === "number" && Number.isFinite(input.recentImprovement)
    ? input.recentImprovement
    : null;
  const uncertainty = typeof input.uncertainty === "number" && Number.isFinite(input.uncertainty)
    ? Math.max(0, Math.min(100, input.uncertainty))
    : null;

  const masteryState: MasteryState = attempts === 0 || mastery === null
    ? "unobserved"
    : attempts >= 3 && mastery >= 80 && (errorRate === null || errorRate < 30)
      ? "demonstrated"
      : attempts >= 2 && (mastery < 50 || (errorRate !== null && errorRate >= 60))
        ? "struggling"
        : "developing";

  const trajectory: LearningTrajectory = attempts < 2 || improvement === null
    ? "unknown"
    : improvement >= 3
      ? "improving"
      : improvement <= -3
        ? "declining"
        : "steady";

  const evidenceStrength = attempts === 0
    ? "none"
    : attempts < 3
      ? "limited"
      : attempts < 6
        ? "moderate"
        : "strong";
  const confidence = attempts === 0 || uncertainty === null
    ? null
    : Math.round(Math.max(0, Math.min(100, 100 - uncertainty)));

  const rationale: string[] = [];
  if (attempts === 0 || mastery === null) rationale.push("No scored learning evidence is available yet.");
  else rationale.push(`${attempts} recorded scored attempt(s) inform this state.`);
  if (masteryState === "demonstrated") rationale.push("Mastery is at least 80 across three or more attempts with a low observed error rate.");
  if (masteryState === "struggling") rationale.push("Repeated evidence shows low mastery or a high error rate.");
  if (masteryState === "developing") rationale.push("Evidence exists, but it does not yet meet the demonstrated or struggling thresholds.");
  if (trajectory === "improving") rationale.push("Recent improvement is at least 3 points.");
  if (trajectory === "declining") rationale.push("Recent improvement is at or below -3 points.");
  if (trajectory === "unknown") rationale.push("There is not enough repeated evidence to establish a trajectory.");

  return {
    mastery: masteryState,
    trajectory,
    evidenceStrength,
    evidenceCount: attempts,
    confidence,
    rationale,
  };
}
