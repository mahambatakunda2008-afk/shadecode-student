import { observationScore, transitionMastery } from "@/lib/intelligence/masteryTransition";

export interface TopicLearningState {
  topicId: string;
  mastery: number;
  retention: number;
  confidence: number;
  stability: number;
  exposure: number;
  errorRate: number;
  responseSpeed: number;
  prerequisiteHealth: number;
  recentImprovement: number;
  uncertainty: number;
  lastObservedAt?: string;
}

export interface LearningObservation {
  topicId: string;
  correct: boolean;
  evidenceScore?: number;
  confidence?: number;
  responseSeconds?: number;
  difficulty?: number;
  observedAt?: string;
}

export interface TopicMasteryProjection {
  mastery_score: number;
  last_score: number;
  attempts: number;
  trend: number;
  retention: number;
  confidence: number;
  stability: number;
  exposure: number;
  error_rate: number;
  response_speed: number;
  prerequisite_health: number;
  recent_improvement: number;
  uncertainty: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function observationEvidence(observation: LearningObservation): number {
  return observation.evidenceScore == null
    ? observationScore(observation.correct)
    : clamp(observation.evidenceScore);
}

export function createInitialLearningState(topicId: string): TopicLearningState {
  return {
    topicId,
    mastery: 50,
    retention: 50,
    confidence: 50,
    stability: 50,
    exposure: 0,
    errorRate: 50,
    responseSpeed: 50,
    prerequisiteHealth: 50,
    recentImprovement: 0,
    uncertainty: 80,
  };
}

/**
 * Authoritative pure richer-state transition for one observable learning event.
 * The initial 50 mastery is a placeholder, not observed evidence. The first
 * real observation therefore establishes the baseline; later observations use
 * the shared 70/30 history/evidence transition.
 */
export function reduceLearningObservation(
  previous: TopicLearningState,
  observation: LearningObservation,
): TopicLearningState {
  if (previous.topicId !== observation.topicId) {
    throw new Error("Learning observation topic does not match state topic");
  }

  const priorMastery = previous.mastery;
  const evidence = observationEvidence(observation);
  const mastery = previous.exposure === 0
    ? transitionMastery(null, evidence)
    : transitionMastery(priorMastery, evidence);
  const errorRate = clamp(previous.errorRate * 0.85 + (observation.correct ? 0 : 100) * 0.15);
  const confidence = clamp(
    previous.confidence * 0.8 + clamp(observation.confidence ?? previous.confidence) * 0.2,
  );
  const responseSpeed = observation.responseSeconds == null
    ? previous.responseSpeed
    : clamp(100 - observation.responseSeconds / 3);
  const exposure = Math.max(0, Math.floor(previous.exposure) + 1);
  const recentImprovement = clamp(mastery - priorMastery, -100, 100);
  const uncertainty = clamp(previous.uncertainty * 0.92);

  return {
    ...previous,
    mastery: Number(mastery.toFixed(2)),
    retention: Number(clamp(previous.retention + (observation.correct ? 1.5 : -2)).toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    stability: Number(clamp(previous.stability + (observation.correct ? 1 : -1)).toFixed(2)),
    exposure,
    errorRate: Number(errorRate.toFixed(2)),
    responseSpeed: Number(responseSpeed.toFixed(2)),
    recentImprovement: Number(recentImprovement.toFixed(2)),
    uncertainty: Number(uncertainty.toFixed(2)),
    lastObservedAt: observation.observedAt ?? previous.lastObservedAt,
  };
}

export function projectTopicMastery(
  previous: Pick<TopicLearningState, "mastery"> | null,
  next: TopicLearningState,
  evidenceScore: number,
  attempts: number,
): TopicMasteryProjection {
  const previousMastery = previous?.mastery ?? null;

  return {
    mastery_score: clamp(next.mastery),
    last_score: clamp(evidenceScore),
    attempts: Math.max(0, Math.floor(attempts)),
    trend: previousMastery == null ? 0 : Number((next.mastery - previousMastery).toFixed(2)),
    retention: next.retention,
    confidence: next.confidence,
    stability: next.stability,
    exposure: next.exposure,
    error_rate: next.errorRate,
    response_speed: next.responseSpeed,
    prerequisite_health: next.prerequisiteHealth,
    recent_improvement: next.recentImprovement,
    uncertainty: next.uncertainty,
  };
}

export const updateLearningState = reduceLearningObservation;
