import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CurriculumKnowledgeItem } from "./knowledge";
import type { CurriculumObjective, ObjectiveSkillMapping } from "./objective-first";
import type { CurriculumVersionRecord } from "./resolver";
import { resolveSystemCurriculum, type SystemCurriculumResolution } from "./system-resolver";
import {
  normalizeStoredCurriculumIdentities,
  toLearnerCurriculumContext,
  type StoredCurriculumIdentity,
} from "./user-profile";

export interface UserSystemCurriculumResolution extends SystemCurriculumResolution {
  identity?: StoredCurriculumIdentity;
}

function asVersion(row: Record<string, unknown>): CurriculumVersionRecord {
  return {
    id: String(row.id),
    identity: {
      boardId: String(row.board_id ?? ""),
      qualificationId: String(row.qualification_id ?? ""),
      level: String(row.level ?? "") as StoredCurriculumIdentity["level"],
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

  const resolvedIdentity: StoredCurriculumIdentity & { syllabusId: string; syllabusVersion: string } = identity;
  const learner = toLearnerCurriculumContext(resolvedIdentity);
  const baseFilter = (query: any) => query
    .eq("board_id", resolvedIdentity.boardId)
    .eq("qualification_id", resolvedIdentity.qualificationId)
    .eq("level", resolvedIdentity.level)
    .eq("syllabus_id", resolvedIdentity.syllabusId)
    .eq("syllabus_version", resolvedIdentity.syllabusVersion)
    .eq("subject_id", resolvedIdentity.subjectId);

  const [versionsResult, objectivesResult, mappingsResult, knowledgeResult] = await Promise.all([
    baseFilter(supabase.from("curriculum_versions").select("*")),
    baseFilter(supabase.from("curriculum_objectives").select("*")),
    supabase.from("objective_skill_mappings").select("*"),
    baseFilter(supabase.from("curriculum_knowledge").select("*")),
  ]);

  if (versionsResult.error || objectivesResult.error || mappingsResult.error || knowledgeResult.error) {
    const reason = "Unable to load the verified curriculum knowledge required for this learner.";
    return { identity, blocked: true, reason, resolved: { status: "unverified", reason, objectives: [], mappings: [], knowledge: [], knowledgeByKind: {} } };
  }

  const objectives = (objectivesResult.data ?? []).map((row: Record<string, unknown>) => asObjective(row, resolvedIdentity));
  const mappings = (mappingsResult.data ?? []).map((row: Record<string, unknown>) => asMapping(row));
  const knowledge = (knowledgeResult.data ?? []).map((row: Record<string, unknown>) => asKnowledge(row));
  const versions = (versionsResult.data ?? []).map((row: Record<string, unknown>) => asVersion(row));

  return { identity, ...resolveSystemCurriculum({ learner, versions, objectives, mappings, knowledge }) };
}
