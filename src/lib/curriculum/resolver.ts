import type {
  CurriculumIdentity,
  CurriculumObjective,
  ObjectiveSkillMapping,
} from "./objective-first";
import { hasCompleteCurriculumIdentity } from "./objective-first";
import type { CurriculumKnowledgeItem, CurriculumKnowledgeKind } from "./knowledge";

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
  knowledge: CurriculumKnowledgeItem[];
  knowledgeByKind: Partial<Record<CurriculumKnowledgeKind, CurriculumKnowledgeItem[]>>;
}

const REQUIRED_KNOWLEDGE_KINDS: CurriculumKnowledgeKind[] = [
  "topic",
  "content_scope",
  "competency",
  "skill",
  "progression",
  "assessment_requirement",
  "paper_component",
  "assessment_weighting",
  "examination_format",
  "practical_activity",
  "project_requirement",
  "coursework_requirement",
  "terminology",
  "constraint",
  "guidance",
  "resource",
];

function identityMatches(learner: LearnerCurriculumContext, version: CurriculumIdentity): boolean {
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

function isEffective(version: CurriculumVersionRecord, asOf: string): boolean {
  if (version.effectiveFrom && asOf < version.effectiveFrom) return false;
  if (version.effectiveTo && asOf > version.effectiveTo) return false;
  return true;
}

function groupKnowledge(items: CurriculumKnowledgeItem[]) {
  return items.reduce((groups, item) => {
    (groups[item.kind] ??= []).push(item);
    return groups;
  }, {} as Partial<Record<CurriculumKnowledgeKind, CurriculumKnowledgeItem[]>>);
}

function missingKnowledgeKinds(items: CurriculumKnowledgeItem[]): CurriculumKnowledgeKind[] {
  const kinds = new Set(items.map((item) => item.kind));
  return REQUIRED_KNOWLEDGE_KINDS.filter((kind) => !kinds.has(kind));
}

/**
 * Resolve the exact curriculum context Cortex is allowed to use.
 *
 * Fail closed. A verified objective list is not enough. Production curriculum
 * resolution requires verified knowledge across the teaching, progression,
 * assessment, practical/project, terminology, constraint, guidance and
 * resource layers. This prevents a thin objective seed from masquerading as a
 * complete syllabus.
 */
export function resolveCurriculumContext(input: {
  learner: LearnerCurriculumContext;
  versions: CurriculumVersionRecord[];
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
  knowledge?: CurriculumKnowledgeItem[];
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

  const empty = {
    objectives: [] as CurriculumObjective[],
    mappings: [] as ObjectiveSkillMapping[],
    knowledge: [] as CurriculumKnowledgeItem[],
    knowledgeByKind: {} as Partial<Record<CurriculumKnowledgeKind, CurriculumKnowledgeItem[]>>,
  };

  if (!hasCompleteCurriculumIdentity(identity)) {
    return { status: "unverified", reason: "Learner curriculum identity is incomplete; exam-specific claims are blocked.", ...empty };
  }

  const version = versions.find(
    (candidate) => candidate.status === "verified" && identityMatches(learner, candidate.identity) && isEffective(candidate, asOf),
  );

  if (!version) {
    return { status: "unverified", reason: "No verified curriculum version matches the learner's exact curriculum identity.", ...empty };
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
  const resolvedMappings = mappings.filter((mapping) => mapping.status === "verified" && objectiveIds.has(mapping.objectiveId));

  const resolvedKnowledge = (input.knowledge ?? []).filter(
    (item) =>
      item.status === "verified" &&
      item.provenance.mappingStatus === "verified" &&
      item.identity.boardId === identity.boardId &&
      item.identity.qualificationId === identity.qualificationId &&
      item.identity.level === identity.level &&
      item.identity.syllabusId === identity.syllabusId &&
      item.identity.syllabusVersion === identity.syllabusVersion &&
      item.identity.subjectId === identity.subjectId &&
      (!identity.paperOrComponentId || item.identity.paperComponentId === identity.paperOrComponentId),
  );

  if (!resolvedKnowledge.length) {
    return { status: "unverified", reason: "No verified whole-syllabus knowledge is available for the exact curriculum version.", ...empty };
  }

  const missingKinds = missingKnowledgeKinds(resolvedKnowledge);
  if (missingKinds.length) {
    return {
      status: "unverified",
      reason: `Whole-syllabus knowledge is incomplete. Missing verified layers: ${missingKinds.join(", ")}. Teaching and assessment claims remain blocked until those layers are reconciled.`,
      ...empty,
    };
  }

  return {
    status: "resolved",
    reason: "Exact verified curriculum context and all required whole-syllabus knowledge layers resolved successfully.",
    curriculum: identity,
    versionId: version.id,
    objectives: resolvedObjectives,
    mappings: resolvedMappings,
    knowledge: resolvedKnowledge,
    knowledgeByKind: groupKnowledge(resolvedKnowledge),
  };
}
