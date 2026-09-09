/* ─────────────────────────────────────────────
   CORE EVENT SYSTEM
───────────────────────────────────────────── */

import type { SystemCurriculumContext } from "@/lib/curriculum/system-curriculum-context";

export type CortexEventType =
  | "dashboard.loaded"
  | "streak.updated"
  | "subject.created"
  | "subject.deleted"
  | "task.created"
  | "task.completed"
  | "task.deleted"
  | "timetable.generated"
  | "timetable.saved"
  | "exam.completed"
  | "exam.question.answered"
  | "exam.marking.completed"
  | "lesson_started"
  | "lesson_completed"
  | "quiz_completed"
  | "challenge_completed"
  | "study_session_started"
  | "study_session_finished"
  | "verify.completed"
  | "studyspace.assessment.completed";

/* ─────────────────────────────────────────────
   CONTEXT FOR AI INSIGHTS (ENGINE USE)
───────────────────────────────────────────── */

export interface CortexInsightContext {
  events: CortexEvent[];
  snapshot: CortexSnapshot;
};

export type CortexEventSource =
  | "dashboard"
  | "tasks"
  | "timetable"
  | "exam"
  | "lesson"
  | "quiz"
  | "challenge"
  | "study-session"
  | "verify"
  | "studyspace";

export interface CortexEventData {
  [key: string]: boolean | number | string | null | undefined;
}

export interface CortexEvent {
  id: string;
  userId: string;
  type: CortexEventType;
  source: CortexEventSource;
  createdAt: string;
  data?: CortexEventData;
}

export interface CortexEventInput {
  id?: string;
  userId: string;
  type: CortexEventType;
  source: CortexEventSource;
  data?: CortexEventData;
}

/* ─────────────────────────────────────────────
   SNAPSHOT (REAL-TIME USER STATE)
───────────────────────────────────────────── */

export interface CortexSnapshot {
  streak: number;
  level: number;
  xp: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  subjects: string[];
  recentTaskTitles: string[];
  weakestSubjects?: string[];
  strongestSubjects?: string[];
  curriculumCompletionPercent?: number;
  currentLesson?: { id: string; title: string } | null;
  recommendedNextLesson?: { id: string; title: string } | null;
  completedLessonCount?: number;
  lockedLessonCount?: number;
  lastExamScore?: number;
  lastExamSubject?: string;
  weeklyGoalMinutes?: number;
  minutesThisWeek?: number;
  goalPercentComplete?: number;
}

/* ─────────────────────────────────────────────
   AI RUNTIME CONTEXT
───────────────────────────────────────────── */

export interface CortexContext {
  userId?: string;
  history?: unknown[];
  snapshot?: CortexSnapshot;
  events?: CortexEvent[];
  [key: string]: unknown;
}

/* ─────────────────────────────────────────────
   GENERIC STRUCTURE SUPPORT (AI SAFE)
───────────────────────────────────────────── */

export type CortexStructuredValue =
  | null
  | boolean
  | number
  | string
  | CortexStructuredValue[]
  | { [key: string]: CortexStructuredValue };

/* ─────────────────────────────────────────────
   AI REQUEST SYSTEM
───────────────────────────────────────────── */

export type CortexAIRequestType =
  | "behavior.insight"
  | "behavior.summary"
  | "learning.focus"
  | "learning.recommendation";

export interface CortexBehaviorInsightPayload {
  userId: string;
  snapshot: CortexSnapshot;
  events?: CortexEvent[];
  fingerprint?: string;
  curriculumContext?: SystemCurriculumContext | null;
}

export interface CortexBehaviorSummaryPayload {
  userId: string;
  behaviorSummary: string;
  fingerprint?: string;
  curriculumContext?: SystemCurriculumContext | null;
}

export interface CortexLearningFocusPayload {
  userId: string;
  snapshot: CortexSnapshot;
  recentExamScore?: number;
  weakestSubjects?: string[];
  curriculumContext?: SystemCurriculumContext | null;
}

export interface CortexLearningRecommendationPayload {
  userId: string;
  snapshot: CortexSnapshot;
  topic: string;
  subject: string;
  curriculumContext?: SystemCurriculumContext | null;
}

/* ─────────────────────────────────────────────
   REQUEST MAPS
───────────────────────────────────────────── */

export interface CortexAIRequestPayloadMap {
  "behavior.insight": CortexBehaviorInsightPayload;
  "behavior.summary": CortexBehaviorSummaryPayload;
  "learning.focus": CortexLearningFocusPayload;
  "learning.recommendation": CortexLearningRecommendationPayload;
}

export interface CortexAIResponseDataMap {
  "behavior.insight": { insight: string };
  "behavior.summary": { insight: string };
  "learning.focus": { insight: string; focus: string };
  "learning.recommendation": { insight: string };
}

/* ─────────────────────────────────────────────
   RESPONSE WRAPPER
───────────────────────────────────────────── */

export type CortexAIProvider = "local" | "gemini" | "ai";

export interface CortexAIResponse<
  T extends CortexAIRequestType = CortexAIRequestType
> {
  requestType: T;
  provider: CortexAIProvider;
  cached: boolean;
  fingerprint: string;
  cacheKey: string;
  data: CortexAIResponseDataMap[T];
}

/* ─────────────────────────────────────────────
   CACHE LAYER
───────────────────────────────────────────── */

export interface CortexCacheEntry<T = unknown> {
  createdAt: string;
  value: T;
}
