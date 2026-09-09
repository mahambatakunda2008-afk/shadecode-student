export type CurriculumKnowledgeKind =
  | "objective"
  | "topic"
  | "content_scope"
  | "competency"
  | "learning_outcome"
  | "practical_activity"
  | "project_requirement"
  | "assessment_requirement"
  | "paper_component"
  | "assessment_weighting"
  | "examination_format"
  | "terminology"
  | "skill"
  | "prerequisite"
  | "progression"
  | "resource"
  | "constraint"
  | "guidance"
  | "note";

export type CurriculumKnowledgeStatus = "draft" | "verified" | "archived";

export interface CurriculumKnowledgeIdentity {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperComponentId?: string;
}

export interface CurriculumKnowledgeProvenance {
  authority: string;
  sourceDocument: string;
  sourceUrl: string;
  retrievedAt: string;
  sectionOrPage?: string;
  mappingStatus: "pending" | "reviewed" | "verified";
  versionEvidence?: string[];
  versionSource?: "registry" | "document" | "unresolved";
  versionConflict?: boolean;
}

export interface CurriculumKnowledgeItem {
  id: string;
  kind: CurriculumKnowledgeKind;
  code?: string;
  title: string;
  content: string;
  status: CurriculumKnowledgeStatus;
  identity: CurriculumKnowledgeIdentity;
  provenance: CurriculumKnowledgeProvenance;
  parentId?: string;
  topicCode?: string;
  objectiveIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface CurriculumKnowledgeBundle {
  identity: CurriculumKnowledgeIdentity;
  items: CurriculumKnowledgeItem[];
  verifiedOnly: boolean;
}

export function hasCompleteKnowledgeIdentity(identity: Partial<CurriculumKnowledgeIdentity>): identity is CurriculumKnowledgeIdentity {
  return Boolean(identity.boardId && identity.qualificationId && identity.level && identity.syllabusId && identity.syllabusVersion && identity.subjectId);
}

export function isUsableCurriculumKnowledge(item: CurriculumKnowledgeItem, options: { verifiedOnly?: boolean } = {}): boolean {
  if (!hasCompleteKnowledgeIdentity(item.identity) || item.status === "archived") return false;
  if (options.verifiedOnly && (item.status !== "verified" || item.provenance.mappingStatus !== "verified")) return false;
  return true;
}

export function buildCurriculumKnowledgeBundle(identity: CurriculumKnowledgeIdentity, items: CurriculumKnowledgeItem[], verifiedOnly = true): CurriculumKnowledgeBundle {
  return { identity, items: items.filter((item) => isUsableCurriculumKnowledge(item, { verifiedOnly })), verifiedOnly };
}
