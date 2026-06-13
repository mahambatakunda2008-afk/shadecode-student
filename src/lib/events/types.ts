/**
 * /lib/events/types.ts
 *
 * Unified Event Pipeline - Standardized Event Types
 */

/**
 * Standardized event types for the unified event pipeline
 */
export type EventType =
  | "lesson_started"
  | "lesson_completed"
  | "quiz_completed"
  | "exam_completed"
  | "challenge_completed"
  | "study_session_started"
  | "study_session_finished";

/**
 * Base event structure
 */
export interface BaseEvent {
  id: string;
  userId: string;
  type: EventType;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Lesson started event
 */
export interface LessonStartedEvent extends BaseEvent {
  type: "lesson_started";
  data: {
    lessonId: string;
    lessonTitle: string;
    subject: string;
    difficulty?: string;
  };
}

/**
 * Lesson completed event
 */
export interface LessonCompletedEvent extends BaseEvent {
  type: "lesson_completed";
  data: {
    lessonId: string;
    lessonTitle: string;
    subject: string;
    progress: number;
    timeSpent: number;
    score?: number;
    attempts: number;
  };
}

/**
 * Quiz completed event
 */
export interface QuizCompletedEvent extends BaseEvent {
  type: "quiz_completed";
  data: {
    quizId: string;
    lessonId?: string;
    subject: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
  };
}

/**
 * Exam completed event
 */
export interface ExamCompletedEvent extends BaseEvent {
  type: "exam_completed";
  data: {
    examId: string;
    subject: string;
    topic?: string;
    score: number;
    totalMarks: number;
    grade: string;
    weakAreas: string[];
    strongAreas: string[];
    timeSpent: number;
  };
}

/**
 * Challenge completed event
 */
export interface ChallengeCompletedEvent extends BaseEvent {
  type: "challenge_completed";
  data: {
    challengeId: string;
    challengeType: string;
    subject?: string;
    completed: boolean;
    score?: number;
    xpEarned: number;
    timeSpent: number;
  };
}

/**
 * Study session started event
 */
export interface StudySessionStartedEvent extends BaseEvent {
  type: "study_session_started";
  data: {
    sessionId: string;
    subject: string;
    lessonId?: string;
    activityType: "lesson" | "quiz" | "exam" | "revision" | "challenge";
  };
}

/**
 * Study session finished event
 */
export interface StudySessionFinishedEvent extends BaseEvent {
  type: "study_session_finished";
  data: {
    sessionId: string;
    subject: string;
    lessonId?: string;
    activityType: "lesson" | "quiz" | "exam" | "revision" | "challenge";
    duration: number;
    xpEarned: number;
    activities: Array<{
      type: string;
      itemId: string;
      startTime: string;
      endTime: string;
      duration: number;
    }>;
  };
}

/**
 * Union type for all events
 */
export type UnifiedEvent =
  | LessonStartedEvent
  | LessonCompletedEvent
  | QuizCompletedEvent
  | ExamCompletedEvent
  | ChallengeCompletedEvent
  | StudySessionStartedEvent
  | StudySessionFinishedEvent;

/**
 * Event handler interface
 */
export interface EventHandler {
  handle(event: UnifiedEvent): Promise<void>;
  priority: number;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  eventType: EventType;
  handler: EventHandler;
}

/**
 * Event pipeline configuration
 */
export interface EventPipelineConfig {
  enablePersistence: boolean;
  enableRealtime: boolean;
  enableAnalytics: boolean;
  enableCortex: boolean;
  enableAchievements: boolean;
  enableRecommendations: boolean;
}
