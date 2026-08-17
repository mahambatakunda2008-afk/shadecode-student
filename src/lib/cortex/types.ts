/* ─────────────────────────────────────────────
   CORE EVENT SYSTEM
───────────────────────────────────────────── */

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
  | "exam.marking.completed";

export interface CortexInsightContext {
  events: CortexEvent[];
  snapshot: CortexSnapshot;
};

export type CortexEventSource =
  | "dashboard"
  | "tasks"
  | "timetable"
  | "exam";

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
  userId: string;
  type: CortexEventType;
  source: CortexEventSource;
  data?: CortexEventData;
}

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

export interface CortexContext {
  userId?: string;
  history?: unknown[];
  snapshot?: CortexSnapshot;
  events?: CortexEvent[];
  [key: string]: unknown;
}

export type CortexStructuredValue =
  | null
  | boolean
  | number
  | string
  | CortexStructuredValue[]
  | { [key: string]: CortexStructuredValue };

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
}

export interface CortexBehaviorSummaryPayload {
  userId: string;
  behaviorSummary: string;
  fingerprint?: string;
}

export interface CortexLearningFocusPayload {
  userId: string;
  snapshot: CortexSnapshot;
  recentExamScore?: number;
  weakestSubjects?: string[];
}

export interface CortexLearningRecommendationPayload {
  userId: string;
  snapshot: CortexSnapshot;
  topic: string;
  subject: string;
}

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

/** `ai` means the unified provider chain; `local` means deterministic/local Cortex logic. */
export type CortexAIProvider = "local" | "ai" | "gemini";

export interface CortexAIResponse<T extends CortexAIRequestType = CortexAIRequestType> {
  requestType: T;
  provider: CortexAIProvider;
  cached: boolean;
  fingerprint: string;
  cacheKey: string;
  data: CortexAIResponseDataMap[T];
}

export interface CortexCacheEntry<T = unknown> {
  createdAt: string;
  value: T;
}
