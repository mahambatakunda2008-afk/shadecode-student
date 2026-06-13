/**
 * /lib/events/emit.ts
 *
 * Unified Event Pipeline - Event Emission Helpers
 */

import { eventPipeline } from "./EventPipeline";
import {
  UnifiedEvent,
  LessonStartedEvent,
  LessonCompletedEvent,
  QuizCompletedEvent,
  ExamCompletedEvent,
  ChallengeCompletedEvent,
  StudySessionStartedEvent,
  StudySessionFinishedEvent,
} from "./types";

/**
 * Emit a lesson started event
 */
export async function emitLessonStarted(
  userId: string,
  data: LessonStartedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: LessonStartedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "lesson_started",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit a lesson completed event
 */
export async function emitLessonCompleted(
  userId: string,
  data: LessonCompletedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: LessonCompletedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "lesson_completed",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit a quiz completed event
 */
export async function emitQuizCompleted(
  userId: string,
  data: QuizCompletedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: QuizCompletedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "quiz_completed",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit an exam completed event
 */
export async function emitExamCompleted(
  userId: string,
  data: ExamCompletedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: ExamCompletedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "exam_completed",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit a challenge completed event
 */
export async function emitChallengeCompleted(
  userId: string,
  data: ChallengeCompletedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: ChallengeCompletedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "challenge_completed",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit a study session started event
 */
export async function emitStudySessionStarted(
  userId: string,
  data: StudySessionStartedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: StudySessionStartedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "study_session_started",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}

/**
 * Emit a study session finished event
 */
export async function emitStudySessionFinished(
  userId: string,
  data: StudySessionFinishedEvent["data"],
  source: string = "unknown"
): Promise<void> {
  const event: StudySessionFinishedEvent = {
    id: crypto.randomUUID(),
    userId,
    type: "study_session_finished",
    timestamp: new Date().toISOString(),
    source,
    data,
  };
  await eventPipeline.emit(event);
}
