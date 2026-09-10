import type { CurriculumKnowledgeIdentity, CurriculumKnowledgeItem } from "./knowledge";
import { buildSystemCurriculumContext, type SystemCurriculumContext } from "./system-curriculum-context";
import type { CurriculumObjective, CurriculumIdentity, ObjectiveSkillMapping } from "./objective-first";
import { resolveCurriculumContext, type CurriculumVersionRecord, type LearnerCurriculumContext, type ResolvedCurriculumContext } from "./resolver";

export interface SystemCurriculumResolutionInput {
  learner: LearnerCurriculumContext;
  versions: CurriculumVersionRecord[];
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
  knowledge: CurriculumKnowledgeItem[];
  asOf?: string;
}

export interface SystemCurriculumResolution {
  resolved: ResolvedCurriculumContext;
  context?: SystemCurriculumContext;
  blocked: boolean;
  reason: string;
}

function toKnowledgeIdentity(identity: CurriculumIdentity): CurriculumKnowledgeIdentity {
  return {
    boardId: identity.boardId,
    qualificationId: identity.qualificationId,
    level: identity.level,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
    subjectId: identity.subjectId,
    paperComponentId: identity.paperOrComponentId,
  };
}

/**
 * Single system-wide curriculum gateway.
 *
 * A verified curriculum version plus verified objectives is enough to establish
 * the authoritative scope for objective-first teaching. Whole-syllabus
 * knowledge is richer grounding, but it must not be a prerequisite for Learn
 * when the objective set itself is already verified.
 */
export function resolveSystemCurriculum(input: SystemCurriculumResolutionInput): SystemCurriculumResolution {
  const resolved = resolveCurriculumContext(input);

  if (resolved.status !== "resolved" || !resolved.curriculum) {
    return { resolved, blocked: true, reason: resolved.reason };
  }

  if (resolved.objectives.length === 0) {
    return {
      resolved,
      blocked: true,
      reason: "Curriculum version is verified, but no verified syllabus objectives are available. Curriculum-aware teaching is blocked until the objective set is verified.",
    };
  }

  const identity = toKnowledgeIdentity(resolved.curriculum);
  const context = buildSystemCurriculumContext(identity, resolved.knowledge, true, resolved.objectives);

  // Objective-first teaching can proceed with zero knowledge rows. The
  // generator must then use the verified objective statements as its minimum
  // scope and clearly distinguish any enrichment. Rich knowledge remains an
  // optional accelerator rather than a hard dependency.
  return {
    resolved,
    context,
    blocked: false,
    reason: context.knowledge.items.length
      ? "Verified objective-first curriculum context resolved with syllabus knowledge."
      : "Verified objective-first curriculum context resolved from the authoritative objective set; no supplemental knowledge pack is available yet.",
  };
}

export function requireSystemCurriculum(input: SystemCurriculumResolutionInput): SystemCurriculumContext {
  const result = resolveSystemCurriculum(input);
  if (result.blocked || !result.context) throw new Error(result.reason);
  return result.context;
}
