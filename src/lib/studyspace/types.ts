export type StudySpaceMode = "workmate" | "practice" | "assessment" | "exam" | "lesson" | "canvas";

export type WorkStatus = "draft" | "submitted" | "marked" | "synced";
export type WorkSyncState = "local" | "pending" | "synced" | "conflict";

export type WorkAssessment = {
  score?: number;
  maxScore?: number;
  percentage?: number;
  grade?: string;
  feedback?: string;
  weakAreas?: string[];
  strongAreas?: string[];
};

export type WorkObject = {
  id: string;
  userId: string;
  mode: StudySpaceMode;
  status?: WorkStatus;
  syncState?: WorkSyncState;
  subject?: string;
  topic?: string;
  lessonId?: string;
  prompt?: string;
  response?: string;
  working?: string;
  attachments?: string[];
  marks?: { earned?: number; available?: number };
  assessment?: WorkAssessment;
  timeSpentMs?: number;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
};