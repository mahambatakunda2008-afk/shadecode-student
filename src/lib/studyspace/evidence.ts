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
  return areas
    .filter((area): area is string => typeof area === "string" && area.trim().length > 0)
    .map((area) => area.trim())
    .slice(0, 20);
}

export function evidenceFromWork(work: WorkObject, id = `${work.id}:${work.updatedAt}`): LearningEvidence {
  const assessmentPercentage = typeof work.assessment?.percentage === "number" ? work.assessment.percentage : undefined;
  const markedPercentage = work.marks?.available && typeof work.marks.earned === "number"
    ? (work.marks.earned / work.marks.available) * 100
    : undefined;
  const percentage = assessmentPercentage ?? (markedPercentage === undefined ? undefined : Math.max(0, Math.min(100, markedPercentage)));
  const score = typeof work.assessment?.score === "number" ? work.assessment.score : work.marks?.earned;
  const weakAreas = cleanAreas(work.assessment?.weakAreas);
  const strongAreas = cleanAreas(work.assessment?.strongAreas);

  const outcome: EvidenceOutcome = percentage === undefined
    ? (work.status === "draft" ? "submitted" : work.response || work.working ? "submitted" : "completed")
    : percentage >= 85 ? "mastered" : percentage < 50 ? "struggled" : "marked";

  return {
    id,
    workId: work.id,
    source: work.mode,
    subject: work.subject?.trim() || undefined,
    topic: work.topic?.trim() || undefined,
    outcome,
    score,
    percentage,
    timeSpentMs: work.timeSpentMs,
    hintsUsed: 0,
    weakAreas,
    strongAreas,
    createdAt: work.updatedAt,
  };
}

export function mergeEvidence(evidence: LearningEvidence[]): LearningEvidence[] {
  return [...evidence].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
