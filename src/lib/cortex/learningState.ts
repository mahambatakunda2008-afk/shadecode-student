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
  confidence?: number;
  responseSeconds?: number;
  difficulty?: number;
  observedAt?: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

/**
 * Creates a deliberately conservative initial state. This is a state estimate,
 * not a claim that the student's true cognitive state equals these numbers.
 */
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
 * Applies one observable learning event to a topic state.
 *
 * This is intentionally bounded and interpretable. It should later be
 * calibrated against real outcomes rather than treated as a validated
 * cognitive-science model.
 */
export function updateLearningState(
  previous: TopicLearningState,
  observation: LearningObservation,
): TopicLearningState {
  if (previous.topicId !== observation.topicId) {
    throw new Error("Learning observation topic does not match state topic");
  }

  const difficulty = clamp(observation.difficulty ?? 50);
  const responseQuality = observation.correct ? 1 : 0;
  const priorMastery = previous.mastery;
  const learningSignal = (responseQuality * 100 - 50) * (0.5 + difficulty / 200);
  const mastery = clamp(priorMastery + learningSignal * 0.12);
  const errorRate = clamp(previous.errorRate * 0.85 + (observation.correct ? 0 : 100) * 0.15);
  const confidence = clamp(
    previous.confidence * 0.8 + clamp(observation.confidence ?? previous.confidence) * 0.2,
  );
  const responseSpeed = observation.responseSeconds == null
    ? previous.responseSpeed
    : clamp(100 - observation.responseSeconds / 3);
  const exposure = clamp(previous.exposure + 1);
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
