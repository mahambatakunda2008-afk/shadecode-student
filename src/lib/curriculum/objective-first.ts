/**
 * Objective-first curriculum domain for Code Lab.
 *
 * This module intentionally sits beside the older curriculum model. It is the
 * foundation for versioned, board-aware learning and must not infer a syllabus
 * from a subject name alone.
 */

export type EducationLevel =
  | "primary"
  | "lower_secondary"
  | "o_level"
  | "igcse"
  | "as_level"
  | "a_level"
  | "vocational"
  | "technical"
  | "university"
  | "polytechnic";

export type ContentStatus = "draft" | "verified" | "archived";
export type ActivityLabel = "examinable" | "enrichment" | "unverified";

export interface CurriculumIdentity {
  boardId: string;
  qualificationId: string;
  level: EducationLevel;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId?: string;
  examSession?: string;
}

export interface CurriculumProvenance {
  authority: string;
  sourceDocument: string;
  sourceUrl?: string;
  sectionOrPage?: string;
  retrievedAt: string;
  reviewedAt?: string;
  mappingStatus: "pending" | "reviewed" | "verified";
}

export interface CurriculumObjective {
  id: string;
  curriculum: CurriculumIdentity;
  code: string;
  statement: string;
  status: ContentStatus;
  provenance: CurriculumProvenance;
}

export interface CurriculumSkill {
  id: string;
  name: string;
  description?: string;
}

export interface ObjectiveSkillMapping {
  objectiveId: string;
  skillId: string;
  status: "draft" | "verified";
  provenance: CurriculumProvenance;
}

export interface CodeLabActivityMetadata {
  activityId: string;
  curriculum?: CurriculumIdentity;
  objectiveIds?: string[];
  enrichment?: boolean;
  mappingVerified?: boolean;
}

export function hasCompleteCurriculumIdentity(
  curriculum?: CurriculumIdentity,
): curriculum is CurriculumIdentity {
  return Boolean(
    curriculum?.boardId &&
      curriculum.qualificationId &&
      curriculum.level &&
      curriculum.syllabusId &&
      curriculum.syllabusVersion &&
      curriculum.subjectId,
  );
}

export function canTreatAsExaminable(
  metadata: CodeLabActivityMetadata,
): boolean {
  return Boolean(
    hasCompleteCurriculumIdentity(metadata.curriculum) &&
      metadata.mappingVerified === true &&
      metadata.enrichment !== true &&
      metadata.objectiveIds?.length,
  );
}

export function classifyActivity(
  metadata: CodeLabActivityMetadata,
): ActivityLabel {
  if (canTreatAsExaminable(metadata)) return "examinable";
  if (metadata.enrichment === true) return "enrichment";
  return "unverified";
}
