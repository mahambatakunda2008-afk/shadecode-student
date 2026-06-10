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
  | "exam.marking.completed"
  | "project.started"
  | "project.progress"
  | "project.completed";
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
  | "projects";

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

  // Curriculum integration (optional, backwards compatible)
  curriculumCompletionPercent?: number;
  currentLesson?: { id: string; title: string } | null;
  recommendedNextLesson?: { id: string; title: string } | null;
  completedLessonCount?: number;
  lockedLessonCount?: number;
  totalProjects?: number;
  activeProjectCount?: number;
  completedProjectCount?: number;
  recommendedProject?: { id: string; title: string; progress: number; status: string; xpReward: number } | null;

  lastExamScore?: number;
  lastExamSubject?: string;
}

/* ─────────────────────────────────────────────
   AI RUNTIME CONTEXT (NEW FIX)
   ← this replaces broken router imports
───────────────────────────────────────────── */

export interface CortexContext {
  userId?: string;

  history?: unknown[];
  snapshot?: CortexSnapshot;
  events?: CortexEvent[];

  // flexible extension point (future-proofing)
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

export type CortexAIProvider = "local" | "gemini";

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
