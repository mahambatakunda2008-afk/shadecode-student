import type { CurriculumIdentity } from "./objective-first";
import type { LearnerCurriculumContext } from "./resolver";

export interface StoredCurriculumIdentity extends Omit<CurriculumIdentity, "syllabusId" | "syllabusVersion"> {
  syllabusId?: string;
  syllabusVersion?: string;
  subjectName?: string;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeStoredCurriculumIdentity(value: unknown): StoredCurriculumIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const boardId = text(record.boardId);
  const qualificationId = text(record.qualificationId);
  const level = text(record.level) as CurriculumIdentity["level"] | undefined;
  const subjectId = text(record.subjectId);
  if (!boardId || !qualificationId || !level || !subjectId) return null;
  return {
    boardId,
    qualificationId,
    level,
    subjectId,
    syllabusId: text(record.syllabusId),
    syllabusVersion: text(record.syllabusVersion),
    paperOrComponentId: text(record.paperOrComponentId),
    examSession: text(record.examSession),
    subjectName: text(record.subjectName),
  };
}

export function toLearnerCurriculumContext(identity: StoredCurriculumIdentity & { syllabusId: string; syllabusVersion: string }): LearnerCurriculumContext {
  return {
    boardId: identity.boardId,
    qualificationId: identity.qualificationId,
    level: identity.level,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
    subjectId: identity.subjectId,
    paperOrComponentId: identity.paperOrComponentId,
    examSession: identity.examSession,
  };
}

export function normalizeStoredCurriculumIdentities(value: unknown): StoredCurriculumIdentity[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeStoredCurriculumIdentity).filter((item): item is StoredCurriculumIdentity => item !== null);
}
