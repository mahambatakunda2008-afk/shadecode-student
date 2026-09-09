import type {
  CurriculumIdentity,
  CurriculumObjective,
  ObjectiveSkillMapping,
} from "./objective-first";
import { hasCompleteCurriculumIdentity } from "./objective-first";

export interface LearnerCurriculumContext {
  boardId: string;
  qualificationId: string;
  level: CurriculumIdentity["level"];
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId?: string;
  examSession?: string;
}

export interface CurriculumVersionRecord {
  id: string;
  identity: CurriculumIdentity;
  status: "draft" | "verified" | "archived";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface ResolvedCurriculumContext {
  status: "resolved" | "unverified";
  reason: string;
  curriculum?: CurriculumIdentity;
  versionId?: string;
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
}

function identityMatches(
  learner: LearnerCurriculumContext,
  version: CurriculumIdentity,
): boolean {
  return (
    learner.boardId === version.boardId &&
    learner.qualificationId === version.qualificationId &&
    learner.level === version.level &&
    learner.syllabusId === version.syllabusId &&
    learner.syllabusVersion === version.syllabusVersion &&
    learner.subjectId === version.subjectId &&
    (learner.paperOrComponentId === undefined || learner.paperOrComponentId === version.paperOrComponentId) &&
    (learner.examSession === undefined || learner.examSession === version.examSession)
  );
}

function isEffective(
  version: CurriculumVersionRecord,
  asOf: string,
): boolean {
  if (version.effectiveFrom && asOf < version.effectiveFrom) return false;
  if (version.effectiveTo && asOf > version.effectiveTo) return false;
  return true;
}

/**
 * Resolve the exact curriculum context Cortex is allowed to use.
 *
 * This is intentionally fail-closed: a complete learner identity is required,
 * only verified versions are eligible, and only verified objectives/mappings
 * are returned. No subject-only or level-only inference is performed here.
 */
export function resolveCurriculumContext(input: {
  learner: LearnerCurriculumContext;
  versions: CurriculumVersionRecord[];
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
  asOf?: string;
}): ResolvedCurriculumContext {
  const { learner, versions, objectives, mappings } = input;
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);

  const identity: CurriculumIdentity = {
    boardId: learner.boardId,
    qualificationId: learner.qualificationId,
    level: learner.level,
    syllabusId: learner.syllabusId,
    syllabusVersion: learner.syllabusVersion,
    subjectId: learner.subjectId,
    paperOrComponentId: learner.paperOrComponentId,
    examSession: learner.examSession,
  };

  if (!hasCompleteCurriculumIdentity(identity)) {
    return {
      status: "unverified",
      reason: "Learner curriculum identity is incomplete; exam-specific claims are blocked.",
      objectives: [],
      mappings: [],
    };
  }

  const version = versions.find(
    (candidate) =>
      candidate.status === "verified" &&
      identityMatches(learner, candidate.identity) &&
      isEffective(candidate, asOf),
  );

  if (!version) {
    return {
      status: "unverified",
      reason: "No verified curriculum version matches the learner's exact curriculum identity.",
      objectives: [],
      mappings: [],
    };
  }

  const resolvedObjectives = objectives.filter(
    (objective) =>
      objective.id &&
      objective.status === "verified" &&
      objective.curriculum.boardId === identity.boardId &&
      objective.curriculum.qualificationId === identity.qualificationId &&
      objective.curriculum.level === identity.level &&
      objective.curriculum.syllabusId === identity.syllabusId &&
      objective.curriculum.syllabusVersion === identity.syllabusVersion &&
      objective.curriculum.subjectId === identity.subjectId &&
      (!identity.paperOrComponentId || objective.curriculum.paperOrComponentId === identity.paperOrComponentId) &&
      (!identity.examSession || objective.curriculum.examSession === identity.examSession),
  );

  const objectiveIds = new Set(resolvedObjectives.map((objective) => objective.id));
  const resolvedMappings = mappings.filter(
    (mapping) => mapping.status === "verified" && objectiveIds.has(mapping.objectiveId),
  );

  return {
    status: "resolved",
    reason: "Exact verified curriculum context resolved successfully.",
    curriculum: identity,
    versionId: version.id,
    objectives: resolvedObjectives,
    mappings: resolvedMappings,
  };
}
