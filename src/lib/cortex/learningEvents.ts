import { updateLearningState, type LearningObservation, type TopicLearningState } from "./learningState";

export type LearningEventType =
  | "question_answered"
  | "lesson_completed"
  | "practice_completed"
  | "revision_completed"
  | "exam_question";

export interface LearningEvent extends LearningObservation {
  type: LearningEventType;
}

/** Convert product events into the small observation contract used by SLS. */
export function eventToObservation(event: LearningEvent): LearningObservation {
  return {
    topicId: event.topicId,
    correct: event.correct,
    confidence: event.confidence,
    responseSeconds: event.responseSeconds,
    difficulty: event.difficulty,
    observedAt: event.observedAt,
  };
}

/** Apply a sequence in order. This function is pure and easy to replay. */
export function applyLearningEvents(
  initial: TopicLearningState,
  events: LearningEvent[],
): TopicLearningState {
  return events.reduce(
    (state, event) => updateLearningState(state, eventToObservation(event)),
    initial,
  );
}
