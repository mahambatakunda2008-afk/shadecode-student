import type { StudySpaceMode, WorkObject } from "./types";

export type EvidenceOutcome = "completed" | "submitted" | "marked" | "struggled" | "mastered";

export type LearningEvidence = {
  id: string;
  workId: string;
  source: StudySpaceMode;
  subject?: string;
  topic?: string;
  outcome: EvidenceOutcome;
  score?: number;
  percentage?: number;
  timeSpentMs?: number;
  hintsUsed?: number;
  weakAreas: string[];
  strongAreas: string[];
  createdAt: string;
};

function cleanAreas(areas: unknown): string[] {
  if (!Array.isArray(areas)) return [];
  return areas.filter((area): area is string => typeof area === "string" && area.trim().length > 0).map((area) => area.trim()).slice(0, 20);
}

export function evidenceFromWork(work: WorkObject, id = crypto.randomUUID()): LearningEvidence {
  const percentage = work.marks?.available && typeof work.marks.earned === "number"
    ? Math.max(0, Math.min(100, (work.marks.earned / work.marks.available) * 100))
    : undefined;

  const outcome: EvidenceOutcome = percentage === undefined
    ? (work.response || work.working ? "submitted" : "completed")
    : percentage >= 85 ? "mastered" : percentage < 50 ? "struggled" : "marked";

  return {
    id,
    workId: work.id,
    source: work.mode,
    subject: work.subject?.trim() || undefined,
    topic: work.topic?.trim() || undefined,
    outcome,
    score: work.marks?.earned,
    percentage,
    timeSpentMs: work.timeSpentMs,
    hintsUsed: 0,
    weakAreas: cleanAreas([]),
    strongAreas: cleanAreas([]),
    createdAt: work.updatedAt,
  };
}

export function mergeEvidence(evidence: LearningEvidence[]): LearningEvidence[] {
  return [...evidence].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
