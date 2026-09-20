import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CurriculumKnowledgeItem } from "./knowledge";
import type { CurriculumObjective, ObjectiveSkillMapping } from "./objective-first";
import type { CurriculumCoverageRecord, CurriculumVersionRecord } from "./resolver";
import { resolveSystemCurriculum, type SystemCurriculumResolution } from "./system-resolver";
import {
  normalizeStoredCurriculumIdentities,
  toLearnerCurriculumContext,
  type StoredCurriculumIdentity,
} from "./user-profile";

export interface UserSystemCurriculumResolution extends SystemCurriculumResolution {
  identity?: StoredCurriculumIdentity;
}

/** curriculum_versions has no `level` column; the level is the learner's (as in ai-grounding.ts). */
function asVersion(row: Record<string, unknown>, level: StoredCurriculumIdentity["level"]): CurriculumVersionRecord {
  return {
    id: String(row.id),
    identity: {
      boardId: String(row.board_id ?? ""),
      qualificationId: String(row.qualification_id ?? ""),
      level,
      syllabusId: String(row.syllabus_id ?? ""),
      syllabusVersion: String(row.syllabus_version ?? ""),
      subjectId: String(row.subject_id ?? ""),
    },
    status: row.status as CurriculumVersionRecord["status"],
    effectiveFrom: typeof row.effective_from === "string" ? row.effective_from : null,
    effectiveTo: typeof row.effective_to === "string" ? row.effective_to : null,
  };
}

function asObjective(row: Record<string, unknown>, identity: StoredCurriculumIdentity & { syllabusId: string; syllabusVersion: string }): CurriculumObjective {
  return {
    id: String(row.id),
    curriculum: {
      ...identity,
      paperOrComponentId: typeof row.paper_component === "string" ? row.paper_component : identity.paperOrComponentId,
    },
    code: String(row.objective_key ?? ""),
    statement: String(row.description ?? row.title ?? ""),
    status: row.status as CurriculumObjective["status"],
    provenance: row.provenance as CurriculumObjective["provenance"],
  };
}

function asMapping(row: Record<string, unknown>): ObjectiveSkillMapping {
  return {
    objectiveId: String(row.objective_id),
    skillId: String(row.skill_id),
    status: row.mapping_status === "verified" ? "verified" : "draft",
    provenance: row.provenance as ObjectiveSkillMapping["provenance"],
  };
}

function asKnowledge(row: Record<string, unknown>): CurriculumKnowledgeItem {
  return {
    id: String(row.id),
    kind: row.kind as CurriculumKnowledgeItem["kind"],
    code: typeof row.knowledge_key === "string" ? row.knowledge_key : undefined,
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    status: row.status as CurriculumKnowledgeItem["status"],
    identity: {
      boardId: String(row.board_id ?? ""),
      qualificationId: String(row.qualification_id ?? ""),
      level: String(row.level ?? "") as StoredCurriculumIdentity["level"],
      syllabusId: String(row.syllabus_id ?? ""),
      syllabusVersion: String(row.syllabus_version ?? ""),
      subjectId: String(row.subject_id ?? ""),
      paperComponentId: typeof row.paper_component_id === "string" ? row.paper_component_id : undefined,
    },
    provenance: row.provenance as CurriculumKnowledgeItem["provenance"],
    parentId: typeof row.parent_id === "string" ? row.parent_id : undefined,
    topicCode: typeof row.topic_key === "string" ? row.topic_key : undefined,
    objectiveIds: Array.isArray(row.objective_keys) ? row.objective_keys.filter((v): v is string => typeof v === "string") : [],
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
  };
}

/**
 * Load the learner's exact curriculum profile and resolve one shared,
 * verified curriculum context for all curriculum-aware features.
 *
 * Board, level and selected subject determine the learner's curriculum. The
 * syllabus/version are catalog metadata resolved by the system, never manual
 * learner inputs. A curriculum identity is not usable until those catalog
 * fields have been resolved.
 */
export async function resolveUserSystemCurriculum(userId: string, subjectId?: string): Promise<UserSystemCurriculumResolution> {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("curriculum_subjects")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    const reason = "Unable to load the learner's curriculum profile.";
    return { blocked: true, reason, resolved: { status: "unverified", reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  }

  const identities = normalizeStoredCurriculumIdentities(profile?.curriculum_subjects);
  const matches = subjectId
    ? identities.filter((identity) => identity.subjectId === subjectId)
    : identities.length === 1 ? identities : [];

  if (matches.length !== 1) {
    const reason = subjectId
      ? "No exact curriculum profile exists for the requested subject."
      : identities.length > 1
        ? "Multiple curriculum subjects are configured; the active subject must be explicit."
        : "No exact curriculum profile is configured for this learner.";
    return { blocked: true, reason, resolved: { status: "unverified", reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  }

  const identity = matches[0];
  if (!identity.syllabusId || !identity.syllabusVersion) {
    const reason = "The learner's curriculum has not yet resolved to a current syllabus and version.";
    return { identity, blocked: true, reason, resolved: { status: "unverified", reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  }

  const resolvedIdentity: StoredCurriculumIdentity & { syllabusId: string; syllabusVersion: string } = {
    ...identity,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
  };
  const learner = toLearnerCurriculumContext(resolvedIdentity);
  // Live schema: curriculum_versions has no `level`; curriculum_objectives and curriculum_coverage_checks
  // carry only `curriculum_version_id` (not the identity columns); only curriculum_knowledge carries the
  // full identity. Match the version by identity first, then load the rest by version id.
  const knowledgeFilter = (query: any) => query
    .eq("board_id", resolvedIdentity.boardId)
    .eq("qualification_id", resolvedIdentity.qualificationId)
    .eq("level", resolvedIdentity.level)
    .eq("syllabus_id", resolvedIdentity.syllabusId)
    .eq("syllabus_version", resolvedIdentity.syllabusVersion)
    .eq("subject_id", resolvedIdentity.subjectId);

  const loadFailure = () => {
    const reason = "Unable to load the verified curriculum knowledge required for this learner.";
    return { identity, blocked: true as const, reason, resolved: { status: "unverified" as const, reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  };

  const versionsResult = await supabase.from("curriculum_versions").select("*")
    .eq("board_id", resolvedIdentity.boardId)
    .eq("qualification_id", resolvedIdentity.qualificationId)
    .eq("syllabus_id", resolvedIdentity.syllabusId)
    .eq("syllabus_version", resolvedIdentity.syllabusVersion)
    .eq("subject_id", resolvedIdentity.subjectId);
  if (versionsResult.error) return loadFailure();

  const versions = (versionsResult.data ?? []).map((row: Record<string, unknown>) => asVersion(row, resolvedIdentity.level));
  const versionIds = versions.map((version: CurriculumVersionRecord) => version.id);
  const byVersion = (table: string, columns: string): PromiseLike<{ data: any[] | null; error: unknown }> =>
    versionIds.length
      ? supabase.from(table).select(columns).in("curriculum_version_id", versionIds)
      : Promise.resolve({ data: [], error: null });

  const [objectivesResult, mappingsResult, knowledgeResult, coverageResult] = await Promise.all([
    byVersion("curriculum_objectives", "*"),
    supabase.from("objective_skill_mappings").select("*"),
    knowledgeFilter(supabase.from("curriculum_knowledge").select("*")),
    byVersion("curriculum_coverage_checks", "dimension,status,evidence,notes"),
  ]);

  if (objectivesResult.error || mappingsResult.error || knowledgeResult.error || coverageResult.error) return loadFailure();

  const objectives = (objectivesResult.data ?? []).map((row: Record<string, unknown>) => asObjective(row, resolvedIdentity));
  const mappings = (mappingsResult.data ?? []).map((row: Record<string, unknown>) => asMapping(row));
  const knowledge = (knowledgeResult.data ?? []).map((row: Record<string, unknown>) => asKnowledge(row));
  const coverageChecks = (coverageResult.data ?? []).map((check: Record<string, unknown>) => ({
    dimension: check.dimension,
    status: check.status,
    evidence: check.evidence,
    notes: check.notes,
  })) as CurriculumCoverageRecord[];

  return { identity, ...resolveSystemCurriculum({ learner, versions, objectives, mappings, knowledge, coverageChecks }) };
}
