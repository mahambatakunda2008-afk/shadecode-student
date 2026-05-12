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
  | "exam.completed" // 🧠 added: exam intelligence hook
  | "exam.question.answered"
  | "exam.marking.completed";

export type CortexEventSource =
  | "dashboard"
  | "tasks"
  | "timetable"
  | "exam";

export interface CortexEventData {
  [key: string]: boolean | number | string | null | undefined;
}

/* ─────────────────────────────────────────────
   CORE EVENT STRUCTURE
───────────────────────────────────────────── */

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

  // 🧠 NEW: learning intelligence layer
  weakestSubjects?: string[];
  strongestSubjects?: string[];

  lastExamScore?: number;
  lastExamSubject?: string;
}

/* ─────────────────────────────────────────────
   CONTEXT FOR AI / INSIGHTS
───────────────────────────────────────────── */

export interface CortexInsightContext {
  events: CortexEvent[];
  snapshot: CortexSnapshot;
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
  | "learning.focus" // 🧠 NEW: exam-driven focus generation
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
   REQUEST MAP
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
