import type { StudySpaceMode, WorkAssessment, WorkObject } from "./types";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWorkObject(input: Partial<WorkObject> & { mode: StudySpaceMode }): WorkObject {
  const timestamp = now();
  return {
    id: input.id ?? createId("work"),
    mode: input.mode,
    status: input.status ?? "draft",
    subject: input.subject?.trim() || undefined,
    topic: input.topic?.trim() || undefined,
    prompt: input.prompt,
    response: input.response,
    working: input.working,
    attachments: input.attachments,
    marks: input.marks,
    assessment: input.assessment,
    timeSpentMs: input.timeSpentMs,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function createExamWork(input: {
  subject?: string;
  topic?: string;
  prompt?: string;
  response?: string;
  working?: string;
  timeSpentMs?: number;
  marks?: WorkObject["marks"];
  assessment?: WorkAssessment;
}): WorkObject {
  return createWorkObject({ ...input, mode: "exam" });
}

export function createPracticeWork(input: {
  subject?: string;
  topic?: string;
  prompt?: string;
  response?: string;
  working?: string;
  timeSpentMs?: number;
}): WorkObject {
  return createWorkObject({ ...input, mode: "practice" });
}

export function createWorkmateWork(input: {
  subject?: string;
  topic?: string;
  prompt?: string;
  response?: string;
  working?: string;
  attachments?: string[];
}): WorkObject {
  return createWorkObject({ ...input, mode: "workmate" });
}
