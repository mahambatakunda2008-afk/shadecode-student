export type LearningScopeKind = "curriculum" | "course" | "module" | "competency" | "qualification" | "general";
export type LearningContentKind = "objective" | "learning-outcome" | "competency" | "topic" | "subtopic" | "concept" | "knowledge" | "skill" | "prerequisite" | "progression" | "practical" | "project" | "assessment" | "exam-format" | "terminology" | "resource" | "constraint" | "guidance";

export interface LearningScopeIdentity {
  kind: LearningScopeKind;
  authorityId?: string; authorityName?: string; boardId?: string; qualificationId?: string; level?: string;
  syllabusId?: string; syllabusVersion?: string; institutionId?: string; institutionName?: string;
  programmeId?: string; programmeName?: string; courseId?: string; courseCode?: string;
  moduleId?: string; moduleCode?: string; subjectId?: string; academicYear?: string; term?: string;
}

export interface LearningContentItem {
  id: string; kind: LearningContentKind; code?: string; title: string; content: string; parentId?: string;
  status: "draft" | "verified" | "archived"; identity: LearningScopeIdentity;
  provenance?: { authority: string; sourceDocument: string; sourceUrl?: string; sectionOrPage?: string; retrievedAt: string; reviewedAt?: string; mappingStatus: "pending" | "reviewed" | "verified" };
  metadata?: Record<string, unknown>;
}

export interface LearningScope { identity: LearningScopeIdentity; content: LearningContentItem[]; complete: boolean; verified: boolean; }

export function sameLearningScope(a: LearningScopeIdentity, b: LearningScopeIdentity): boolean {
  const keys: (keyof LearningScopeIdentity)[] = ["kind", "authorityId", "boardId", "qualificationId", "level", "syllabusId", "syllabusVersion", "institutionId", "programmeId", "courseId", "moduleId", "subjectId", "academicYear", "term"];
  return keys.every((key) => a[key] === b[key]);
}

export function isVerifiedLearningContent(item: LearningContentItem): boolean {
  return item.status === "verified" && item.provenance?.mappingStatus === "verified";
}

export function isScopeUsable(scope: LearningScope): boolean {
  return scope.complete && scope.verified && scope.content.some(isVerifiedLearningContent);
}

export function isContentAligned(activityContentIds: string[], scope: LearningScope): boolean {
  if (!isScopeUsable(scope) || activityContentIds.length === 0) return false;
  const verifiedIds = new Set(scope.content.filter(isVerifiedLearningContent).map((item) => item.id));
  return activityContentIds.every((id) => verifiedIds.has(id));
}
