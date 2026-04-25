export type CortexEventType =
  | "dashboard.loaded"
  | "streak.updated"
  | "subject.created"
  | "subject.deleted"
  | "task.created"
  | "task.completed"
  | "task.deleted"
  | "timetable.generated"
  | "timetable.saved";

export type CortexEventSource = "dashboard" | "tasks" | "timetable";

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
}

export interface CortexInsightContext {
  events: CortexEvent[];
  snapshot: CortexSnapshot;
}

export type CortexStructuredValue =
  | null
  | boolean
  | number
  | string
  | CortexStructuredValue[]
  | { [key: string]: CortexStructuredValue };

export type CortexAIRequestType = "behavior.insight" | "behavior.summary";

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

export interface CortexAIRequestPayloadMap {
  "behavior.insight": CortexBehaviorInsightPayload;
  "behavior.summary": CortexBehaviorSummaryPayload;
}

export interface CortexAIResponseDataMap {
  "behavior.insight": {
    insight: string;
  };
  "behavior.summary": {
    insight: string;
  };
}

export type CortexAIProvider = "local" | "gemini";

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
