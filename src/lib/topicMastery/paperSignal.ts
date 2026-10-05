/**
 * src/lib/topicMastery/paperSignal.ts
 *
 * Pure projection of one paper-study checkpoint verdict onto a `topic_mastery`
 * row. Shared by the attempt and transfer routes, which previously carried
 * duplicate copies that wrote mastery on a 0-1 scale.
 *
 * Scale contract (matches blendMastery, Cortex projections and every reader):
 *   mastery_score, last_score, trend   -> 0-100
 *   confidence, error_rate, uncertainty, retention, stability,
 *   prerequisite_health, recent_improvement -> 0-1
 */

import { blendMastery } from "./blend";

export type PaperVerdict = "correct" | "partially_correct" | "incorrect";

export interface ExistingPaperMastery {
  mastery_score?: number | string | null;
  attempts?: number | string | null;
  confidence?: number | string | null;
  error_rate?: number | string | null;
  exposure?: number | string | null;
  retention?: number | string | null;
  stability?: number | string | null;
  response_speed?: number | string | null;
  prerequisite_health?: number | string | null;
}

export const VERDICT_SCORE: Record<PaperVerdict, number> = {
  correct: 100,
  partially_correct: 55,
  incorrect: 0,
};

const unit = (value: number) => Math.max(0, Math.min(1, value));
const num = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return value == null || !Number.isFinite(parsed) ? fallback : parsed;
};

export function projectPaperSignal(
  existing: ExistingPaperMastery | null | undefined,
  verdict: PaperVerdict,
  nowIso: string,
) {
  const evidence = VERDICT_SCORE[verdict];
  const blended = blendMastery(
    existing
      ? { mastery_score: num(existing.mastery_score, evidence), attempts: num(existing.attempts, 0) }
      : null,
    evidence,
  );
  const confidence = unit(num(existing?.confidence, 0.4) * 0.7 + (evidence / 100) * 0.3);
  const errorRate = unit(num(existing?.error_rate, 0.5) * 0.7 + (verdict === "correct" ? 0 : 1) * 0.3);
  const recentImprovement = Math.max(-1, Math.min(1, blended.trend / 100));

  return {
    row: {
      ...blended,
      last_attempted: nowIso,
      retention: num(existing?.retention, 0.5),
      confidence,
      stability: num(existing?.stability, 0.5),
      exposure: num(existing?.exposure, 0) + 1,
      error_rate: errorRate,
      response_speed: num(existing?.response_speed, 0),
      prerequisite_health: num(existing?.prerequisite_health, 0.5),
      recent_improvement: recentImprovement,
      uncertainty: unit(1 - confidence),
    },
    revisionPriority:
      verdict === "incorrect" ? 9 : verdict === "partially_correct" ? 6 : blended.mastery_score < 65 ? 4 : 1,
    learningEventScore: evidence / 100,
  };
}
