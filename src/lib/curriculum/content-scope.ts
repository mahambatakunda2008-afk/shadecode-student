import type { CurriculumIdentity, CurriculumObjective, CurriculumProvenance } from "./objective-first";
import type {
  LearningContentItem,
  LearningScope,
  LearningScopeIdentity,
} from "../code-lab/learning-scope";

/**
 * Canonical representation of the complete authoritative learning scope.
 *
 * This is deliberately broader than syllabus objectives. A production pack
 * may contain topics, concepts, knowledge, terminology, practical work,
 * projects, assessment requirements, prerequisites, progression and other
 * authoritative constraints. `complete` and `verified` are explicit trust
 * gates and must never be inferred from item count.
 */
export interface AuthoritativeContentPack {
  id: string;
  identity: LearningScopeIdentity;
  source: CurriculumProvenance;
  content: LearningContentItem[];
  complete: boolean;
  verified: boolean;
}

export function curriculumIdentityToLearningScopeIdentity(
  identity: CurriculumIdentity,
): LearningScopeIdentity {
  return {
    kind: "curriculum",
    authorityId: identity.boardId,
    boardId: identity.boardId,
    qualificationId: identity.qualificationId,
    level: identity.level,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
    subjectId: identity.subjectId,
  };
}

export function objectiveToLearningContent(
  objective: CurriculumObjective,
): LearningContentItem {
  return {
    id: objective.id,
    kind: "objective",
    code: objective.code,
    title: objective.code,
    content: objective.statement,
    status: objective.status,
    identity: curriculumIdentityToLearningScopeIdentity(objective.curriculum),
    provenance: objective.provenance,
  };
}

export function createAuthoritativeContentPack(
  input: Omit<AuthoritativeContentPack, "identity"> & {
    identity: CurriculumIdentity | LearningScopeIdentity;
  },
): AuthoritativeContentPack {
  const identity = "boardId" in input.identity && "qualificationId" in input.identity
    ? curriculumIdentityToLearningScopeIdentity(input.identity as CurriculumIdentity)
    : input.identity as LearningScopeIdentity;

  return {
    ...input,
    identity,
  };
}

export function packToLearningScope(pack: AuthoritativeContentPack): LearningScope {
  return {
    identity: pack.identity,
    content: pack.content,
    complete: pack.complete,
    verified: pack.verified,
  };
}
