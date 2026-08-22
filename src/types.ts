/* ─────────────────────────────────────────────
   CORTEX CORE TYPES
   Shadecode Student — Intelligence Layer
───────────────────────────────────────────── */

export type CortexEventType =
  | "dashboard.loaded" | "streak.updated" | "subject.created" | "subject.deleted"
  | "task.created" | "task.completed" | "task.deleted" | "timetable.generated"
  | "timetable.saved" | "exam.completed" | "exam.question.answered" | "exam.marking.completed";
export type CortexEventSource = "dashboard" | "tasks" | "timetable" | "exam";
export interface CortexEventData { [key: string]: string | number | boolean | null | undefined; }
export interface CortexEvent { id: string; userId: string; type: CortexEventType; source: CortexEventSource; createdAt: string; data?: CortexEventData; }
/** Reuse the same id when an offline event is retried so it cannot be counted twice. */
export interface CortexEventInput { userId: string; type: CortexEventType; source: CortexEventSource; data?: CortexEventData; id?: string; }

export interface CortexSnapshot {
  streak: number; level: number; xp: number;
  totalTasks: number; completedTasks: number; pendingTasks: number;
  subjects: string[]; recentTaskTitles: string[];
  weakestSubjects?: string[]; strongestSubjects?: string[];
  lastExamScore?: number; lastExamSubject?: string;
  lastExamWeakAreas?: string[]; lastExamStrongAreas?: string[];
  academicContext?: {
    pathway: "secondary" | "university" | "tvet";
    institution?: string;
    programme?: string;
    yearLevel?: string;
    semester?: string;
    courses?: string[];
  };
}
export interface CortexInsightContext { events: CortexEvent[]; snapshot: CortexSnapshot; }
export type CortexStructuredValue = null | boolean | number | string | CortexStructuredValue[] | { [key: string]: CortexStructuredValue };
export type CortexAIRequestType = "behavior.insight" | "behavior.summary" | "learning.focus" | "learning.recommendation";
export interface CortexBehaviorInsightPayload { userId: string; snapshot: CortexSnapshot; events?: CortexEvent[]; fingerprint?: string; }
export interface CortexBehaviorSummaryPayload { userId: string; behaviorSummary: string; fingerprint?: string; }
export interface CortexLearningFocusPayload { userId: string; snapshot: CortexSnapshot; recentExamScore?: number; weakestSubjects?: string[]; }
export interface CortexLearningRecommendationPayload { userId: string; snapshot: CortexSnapshot; topic: string; subject: string; }
export interface CortexAIRequestPayloadMap { "behavior.insight": CortexBehaviorInsightPayload; "behavior.summary": CortexBehaviorSummaryPayload; "learning.focus": CortexLearningFocusPayload; "learning.recommendation": CortexLearningRecommendationPayload; }
export interface CortexAIResponseDataMap { "behavior.insight": { insight: string }; "behavior.summary": { insight: string }; "learning.focus": { insight: string; focus: string }; "learning.recommendation": { insight: string }; }
export type CortexAIProvider = "local" | "gemini";
export interface CortexAIResponse<T extends CortexAIRequestType = CortexAIRequestType> { requestType: T; provider: CortexAIProvider; cached: boolean; fingerprint: string; cacheKey: string; data: CortexAIResponseDataMap[T]; }
export interface CortexCacheEntry<T = unknown> { createdAt: string; value: T; }

export type StudyLevel = 'high-school' | 'a-level' | 'university' | 'tvet' | 'professional';
export type StudyStyle = 'structured' | 'flexible';
export interface OnboardingFormData {
  displayName: string;
  studyLevel: StudyLevel;
  subjects: string[];
  goals?: string[];
  dailyGoalMinutes: number;
  studyStyle: StudyStyle;
  institution?: string;
  programme?: string;
  yearLevel?: string;
  semester?: string;
  courses?: string[];
}
export interface StepProps { data: Partial<OnboardingFormData>; onUpdate: (patch: Partial<OnboardingFormData>) => void; onNext: () => void; onBack?: () => void; }
export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';
export interface TourStep { id: string; step: number; title: string; description: string; targetSelector: string | null; position: TourPosition; icon: string; badge?: string; tip?: string; }
export interface TourRect { x: number; y: number; width: number; height: number; }
export interface TourContextValue { isActive: boolean; currentStep: number; totalSteps: number; currentStepData: TourStep; targetRect: TourRect | null; startTour: () => void; nextStep: () => void; prevStep: () => void; skipTour: () => void; }
