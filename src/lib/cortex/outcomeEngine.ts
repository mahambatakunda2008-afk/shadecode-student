import type { LearningDecision } from "@/lib/learning-engine/shadecodeLearningUtility";

export type InterventionOutcomeStatus = "started" | "completed" | "abandoned";

export interface InterventionRecord {
  id: string;
  topicId: string;
  decisionScore: number;
  startedAt: string;
  completedAt?: string;
  status: InterventionOutcomeStatus;
  minutesSpent?: number;
  followUpScore?: number;
}

export interface OutcomeEvaluation {
  uptake: number;
  completion: number;
  efficiency: number;
  followUpImprovement: number;
  outcomeScore: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

/** Create a minimal intervention record from a Cortex decision. */
export function startIntervention(decision: LearningDecision, id: string, startedAt: string): InterventionRecord {
  return {
    id,
    topicId: decision.candidate.id,
    decisionScore: decision.score,
    startedAt,
    status: "started",
  };
}

export function completeIntervention(
  record: InterventionRecord,
  completedAt: string,
  minutesSpent: number,
  followUpScore?: number,
): InterventionRecord {
  return {
    ...record,
    status: "completed",
    completedAt,
    minutesSpent: Math.max(0, minutesSpent),
    followUpScore: followUpScore == null ? undefined : clamp(followUpScore),
  };
}

/**
 * Evaluate an intervention without pretending that one outcome proves the
 * algorithm is correct. This is an evaluation signal for Shadow Cortex.
 */
export function evaluateIntervention(record: InterventionRecord, baselineScore?: number): OutcomeEvaluation {
  const uptake = 100;
  const completion = record.status === "completed" ? 100 : record.status === "abandoned" ? 0 : 50;
  const minutes = Math.max(1, record.minutesSpent ?? 15);
  const efficiency = record.status === "completed" ? clamp(100 / Math.sqrt(minutes / 15)) : 0;
  const followUpImprovement = record.followUpScore == null || baselineScore == null
    ? 0
    : clamp(record.followUpScore - baselineScore, -100, 100);
  const outcomeScore = clamp(
    completion * 0.35 + efficiency * 0.2 + followUpImprovement * 0.45,
  );

  return {
    uptake,
    completion,
    efficiency: Number(efficiency.toFixed(2)),
    followUpImprovement: Number(followUpImprovement.toFixed(2)),
    outcomeScore: Number(outcomeScore.toFixed(2)),
  };
}
