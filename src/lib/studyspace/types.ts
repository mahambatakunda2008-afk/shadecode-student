export type StudySpaceMode = "workmate" | "practice" | "assessment" | "exam" | "canvas";

export type WorkStatus = "draft" | "submitted" | "marked" | "synced";

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
  mode: StudySpaceMode;
  status?: WorkStatus;
  subject?: string;
  topic?: string;
  prompt?: string;
  response?: string;
  working?: string;
  attachments?: string[];
  marks?: { earned?: number; available?: number };
  assessment?: WorkAssessment;
  timeSpentMs?: number;
  createdAt: string;
  updatedAt: string;
};
