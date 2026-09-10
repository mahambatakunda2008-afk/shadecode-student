import type { CurriculumIdentity, CurriculumObjective } from "@/lib/curriculum/objective-first";
import type { LearningContentItem, LearningScope, LearningScopeIdentity } from "./learning-scope";

export type CodeLabAlignmentMode = "curriculum" | "academic" | "general";
export interface CodeLabAdapterInput { identity: LearningScopeIdentity; content: LearningContentItem[]; }
export interface CodeLabScopeAdapter { id: string; mode: CodeLabAlignmentMode; supports(identity: LearningScopeIdentity): boolean; toScope(input: CodeLabAdapterInput): LearningScope; }

export function curriculumIdentityToScope(identity: CurriculumIdentity): LearningScopeIdentity {
  return { kind: "curriculum", boardId: identity.boardId, qualificationId: identity.qualificationId, level: identity.level, syllabusId: identity.syllabusId, syllabusVersion: identity.syllabusVersion, subjectId: identity.subjectId };
}

export function curriculumObjectiveToContent(objective: CurriculumObjective): LearningContentItem {
  return { id: objective.id, kind: "objective", code: objective.code, title: objective.code, content: objective.statement, status: objective.status, identity: curriculumIdentityToScope(objective.curriculum), provenance: objective.provenance };
}

export function createGeneralCodeLabScope(identity: LearningScopeIdentity, content: LearningContentItem[] = []): LearningScope {
  return { identity: { ...identity, kind: "general" }, content, complete: false, verified: false };
}

export function createAcademicCodeLabScope(identity: LearningScopeIdentity, content: LearningContentItem[]): LearningScope {
  const verified = content.length > 0 && content.every((item) => item.status === "verified" && item.provenance?.mappingStatus === "verified");
  return { identity: { ...identity, kind: identity.kind === "general" ? "course" : identity.kind }, content, complete: content.length > 0, verified };
}

export const CODE_LAB_SCOPE_ADAPTERS: CodeLabScopeAdapter[] = [
  { id: "school-curriculum", mode: "curriculum", supports: (identity) => identity.kind === "curriculum" && Boolean(identity.boardId && identity.syllabusId), toScope: ({ identity, content }) => ({ identity, content, complete: content.length > 0, verified: content.length > 0 && content.every((item) => item.status === "verified" && item.provenance?.mappingStatus === "verified") }) },
  { id: "academic-course-module", mode: "academic", supports: (identity) => ["course", "module", "competency", "qualification"].includes(identity.kind), toScope: ({ identity, content }) => createAcademicCodeLabScope(identity, content) },
];

export function resolveCodeLabScopeAdapter(identity: LearningScopeIdentity): CodeLabScopeAdapter | undefined {
  return CODE_LAB_SCOPE_ADAPTERS.find((adapter) => adapter.supports(identity));
}
