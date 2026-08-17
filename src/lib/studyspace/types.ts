export type StudySpaceMode = "workmate" | "practice" | "assessment" | "exam" | "canvas";

export type WorkObject = {
  id: string;
  mode: StudySpaceMode;
  subject?: string;
  topic?: string;
  prompt?: string;
  response?: string;
  working?: string;
  attachments?: string[];
  marks?: { earned?: number; available?: number };
  timeSpentMs?: number;
  createdAt: string;
  updatedAt: string;
};
