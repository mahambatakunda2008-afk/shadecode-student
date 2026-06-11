/* ─────────────────────────────────────────────
   CORTEX CORE TYPES
   Shadecode Student — Intelligence Layer
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   EVENT SYSTEM
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

export type CortexEventSource =
  | "dashboard"
  | "tasks"
  | "timetable"
  | "exam";

export interface CortexEventData {
  [key: string]: string | number | boolean | null | undefined;
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
   USER INTELLIGENCE SNAPSHOT
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

  /* ─── Learning Intelligence Layer ─── */
  weakestSubjects?: string[];
  strongestSubjects?: string[];

  lastExamScore?: number;
  lastExamSubject?: string;
  lastExamWeakAreas?: string[];
  lastExamStrongAreas?: string[];
}

/* ─────────────────────────────────────────────
   CONTEXT FOR AI
───────────────────────────────────────────── */

export interface CortexInsightContext {
  events: CortexEvent[];
  snapshot: CortexSnapshot;
}

/* ─────────────────────────────────────────────
   SAFE STRUCTURE (AI / JSON FLEXIBILITY)
───────────────────────────────────────────── */

export type CortexStructuredValue =
  | null
  | boolean
  | number
  | string
  | CortexStructuredValue[]
  | { [key: string]: CortexStructuredValue };

/* ─────────────────────────────────────────────
   AI REQUEST TYPES
───────────────────────────────────────────── */

export type CortexAIRequestType =
  | "behavior.insight"
  | "behavior.summary"
  | "learning.focus"
  | "learning.recommendation";

/* ─────────────────────────────────────────────
   AI PAYLOADS
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   RESPONSE MAP
───────────────────────────────────────────── */

export interface CortexAIResponseDataMap {
  "behavior.insight": { insight: string };
  "behavior.summary": { insight: string };
  "learning.focus": { insight: string; focus: string };
  "learning.recommendation": { insight: string };
}

/* ─────────────────────────────────────────────
   AI RESPONSE WRAPPER
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
   CACHE SYSTEM
───────────────────────────────────────────── */

export interface CortexCacheEntry<T = unknown> {
  createdAt: string;
  value: T;
}

/* ─────────────────────────────────────────────
   ONBOARDING (multi-step UI form)
───────────────────────────────────────────── */

export type StudyLevel = 'high-school' | 'a-level' | 'university' | 'professional';
export type StudyStyle = 'structured' | 'flexible';

export interface OnboardingFormData {
  displayName:      string;
  studyLevel:       StudyLevel;
  subjects:         string[];
  goals?:           string[];
  dailyGoalMinutes: number;
  studyStyle:       StudyStyle;
}

export interface StepProps {
  data:     Partial<OnboardingFormData>;
  onUpdate: (patch: Partial<OnboardingFormData>) => void;
  onNext:   () => void;
  onBack?:  () => void;
}

/* ─────────────────────────────────────────────
   TOUR
───────────────────────────────────────────── */

export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id:             string;
  step:           number;
  title:          string;
  description:    string;
  targetSelector: string | null;
  position:       TourPosition;
  icon:           string;
  badge?:         string;
  tip?:           string;
}

export interface TourRect {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export interface TourContextValue {
  isActive:        boolean;
  currentStep:     number;
  totalSteps:      number;
  currentStepData: TourStep;
  targetRect:      TourRect | null;
  startTour:       () => void;
  nextStep:        () => void;
  prevStep:        () => void;
  skipTour:        () => void;
}
