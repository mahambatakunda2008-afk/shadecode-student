import { createClient } from "@supabase/supabase-js";
import { normalizeStoredCurriculumIdentities } from "./user-profile";
import { resolveSystemCurriculum } from "./system-resolver";
import type { CurriculumKnowledgeItem } from "./knowledge";
import type { CurriculumObjective, ObjectiveSkillMapping } from "./objective-first";
import type { CurriculumCoverageRecord, CurriculumVersionRecord } from "./resolver";
import { curriculumSystemPromptContext } from "./system-curriculum-context";
import { buildLearnCurriculumGrounding, learnCurriculumPromptSection, resolveCurriculumTopic } from "./learn-grounding";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function extractRequestedTopic(prompt: string): string {
  const match = prompt.match(/master this request:\s*"([^"]+)"/i);
  return match?.[1]?.trim() || prompt.slice(0, 500);
}

export type VerifiedCurriculumPromptResult =
  | { status: "none"; promptContext: ""; reason: string; pack?: never; resolvedTopic?: string }
  | { status: "resolved"; promptContext: string; reason: string; resolvedTopic: string; pack: {
      version: 2;
      curriculumId?: string;
      board?: string;
      qualification?: string;
      level?: string;
      subject: string;
      syllabusId?: string;
      syllabusVersion?: string;
      objectives: Array<{ id?: string; code?: string; statement: string }>;
      knowledge: Array<{ id: string; kind: string; code?: string; title: string; content: string; topicCode?: string; objectiveIds?: string[]; parentId?: string; metadata?: Record<string, unknown> }>;
      promptContext?: string;
      cachedAt: string;
    } }
  | { status: "blocked"; promptContext: ""; reason: string; pack?: never; resolvedTopic?: string };

/** Resolve curriculum from learner board, qualification, level and subject. Syllabus identifiers are catalog outputs, not learner input. */
export async function resolveVerifiedCurriculumPromptContext(userId: string, prompt: string): Promise<VerifiedCurriculumPromptResult> {
  const supabase = adminClient();
  if (!supabase || !userId) return { status: "none", promptContext: "", reason: "No curriculum service is configured." };

  const { data: profile, error: profileError } = await supabase.from("profiles").select("curriculum_subjects").eq("id", userId).maybeSingle();
  if (profileError) return { status: "none", promptContext: "", reason: "Curriculum profile could not be read." };

  const identities = normalizeStoredCurriculumIdentities(profile?.curriculum_subjects);
  if (!identities.length) return { status: "none", promptContext: "", reason: "No learner board, level and subject curriculum selection is configured." };

  const normalizedPrompt = prompt.toLowerCase();
  const identity = identities.find((item) => {
    const subject = (item.subjectName ?? item.subjectId).toLowerCase();
    return subject.length >= 4 && normalizedPrompt.includes(subject);
  }) ?? (identities.length === 1 ? identities[0] : null);
  if (!identity) return { status: "blocked", promptContext: "", reason: "Select one of your configured subjects before Cortex applies syllabus-specific teaching." };

  // Discover the current verified syllabus automatically. Older stored syllabus fields are only compatibility hints.
  const versionsResult = await supabase.from("curriculum_versions").select("*")
    .eq("board_id", identity.boardId)
    .eq("qualification_id", identity.qualificationId)
    .eq("subject_id", identity.subjectId)
    .eq("status", "verified");
  if (versionsResult.error) return { status: "blocked", promptContext: "", reason: "Verified curriculum data could not be loaded, so syllabus-aligned teaching is temporarily blocked." };

  const candidateRows = versionsResult.data ?? [];
  if (!candidateRows.length) return { status: "blocked", promptContext: "", reason: "No verified curriculum is available for this learner's board, qualification, level and subject." };

  const versions: CurriculumVersionRecord[] = candidateRows.map((version) => ({
    id: version.id,
    identity: { boardId: version.board_id, qualificationId: version.qualification_id, level: identity.level, syllabusId: version.syllabus_id, syllabusVersion: version.syllabus_version, subjectId: version.subject_id, paperOrComponentId: undefined, examSession: undefined },
    status: version.status,
    effectiveFrom: version.effective_from,
    effectiveTo: version.effective_to,
  }));

  const matchingStoredVersion = identity.syllabusId && identity.syllabusVersion
    ? versions.find((version) => version.identity.syllabusId === identity.syllabusId && version.identity.syllabusVersion === identity.syllabusVersion)
    : undefined;
  const matchingVersion = matchingStoredVersion ?? [...versions].sort((a, b) => String(b.effectiveFrom ?? "").localeCompare(String(a.effectiveFrom ?? "")))[0];
  if (!matchingVersion) return { status: "blocked", promptContext: "", reason: "No suitable verified curriculum version could be selected." };

  const resolvedIdentity = {
    ...identity,
    syllabusId: matchingVersion.identity.syllabusId,
    syllabusVersion: matchingVersion.identity.syllabusVersion,
  };
  const learner = {
    boardId: resolvedIdentity.boardId,
    qualificationId: resolvedIdentity.qualificationId,
    level: resolvedIdentity.level,
    syllabusId: resolvedIdentity.syllabusId,
    syllabusVersion: resolvedIdentity.syllabusVersion,
    subjectId: resolvedIdentity.subjectId,
    paperOrComponentId: resolvedIdentity.paperOrComponentId,
    examSession: resolvedIdentity.examSession,
  };

  const [objectivesResult, mappingsResult, knowledgeResult, coverageResult] = await Promise.all([
    supabase.from("curriculum_objectives").select("*").eq("curriculum_version_id", matchingVersion.id),
    supabase.from("objective_skill_mappings").select("*"),
    supabase.from("curriculum_knowledge").select("*").eq("curriculum_version_id", matchingVersion.id),
    supabase.from("curriculum_coverage_checks").select("dimension,status,evidence,notes").eq("curriculum_version_id", matchingVersion.id),
  ]);
  if (objectivesResult.error || mappingsResult.error || knowledgeResult.error || coverageResult.error) {
    return { status: "blocked", promptContext: "", reason: "Verified curriculum data could not be loaded, so syllabus-aligned teaching is temporarily blocked." };
  }

  const result = resolveSystemCurriculum({
    learner,
    versions,
    coverageChecks: (coverageResult.data ?? []).map((check) => ({ dimension: check.dimension, status: check.status, evidence: check.evidence, notes: check.notes })) as CurriculumCoverageRecord[],
    objectives: (objectivesResult.data ?? []).map((objective) => ({
      id: objective.id,
      curriculum: { boardId: resolvedIdentity.boardId, qualificationId: resolvedIdentity.qualificationId, level: resolvedIdentity.level, syllabusId: resolvedIdentity.syllabusId, syllabusVersion: resolvedIdentity.syllabusVersion, subjectId: resolvedIdentity.subjectId, paperOrComponentId: objective.paper_component ?? undefined },
      code: objective.objective_key, statement: objective.description ?? objective.title, status: objective.status, provenance: objective.provenance ?? {},
    })) as CurriculumObjective[],
    mappings: (mappingsResult.data ?? []).map((mapping) => ({ objectiveId: mapping.objective_id, skillId: mapping.skill_id, status: mapping.mapping_status === "verified" ? "verified" : "draft", provenance: mapping.provenance ?? {} })) as ObjectiveSkillMapping[],
    knowledge: (knowledgeResult.data ?? []).map((item) => ({
      id: item.id, kind: item.kind, code: item.knowledge_key ?? undefined, title: item.title, content: item.content, status: item.status,
      identity: { boardId: item.board_id, qualificationId: item.qualification_id, level: item.level, syllabusId: item.syllabus_id, syllabusVersion: item.syllabus_version, subjectId: item.subject_id, paperComponentId: item.paper_component_id ?? undefined },
      provenance: item.provenance ?? {}, parentId: item.parent_id ?? undefined, topicCode: item.topic_key ?? undefined, objectiveIds: item.objective_keys ?? [], metadata: item.metadata ?? {},
    })) as CurriculumKnowledgeItem[],
  });
  if (result.blocked || !result.context) return { status: "blocked", promptContext: "", reason: result.reason };

  const requestedTopic = extractRequestedTopic(prompt);
  const topicResolution = resolveCurriculumTopic(requestedTopic, result.context.knowledge.items);
  const effectiveTopic = topicResolution.matched ? topicResolution.topic : requestedTopic;
  const topicGrounding = buildLearnCurriculumGrounding(effectiveTopic, result.context.knowledge.items);
  const usefulKnowledge = topicGrounding.items;
  const knowledgeLines = usefulKnowledge.map((item) => `- ${item.kind}: ${item.code ? `[${item.code}] ` : ""}${item.title}${item.content ? ` | ${item.content.slice(0, 500)}` : ""}`);
  const objectiveLines = result.context.objectives.map((objective) => `- ${objective.code}: ${objective.statement}`);
  const pack = {
    version: 2 as const, curriculumId: matchingVersion.id, board: resolvedIdentity.boardId, qualification: resolvedIdentity.qualificationId, level: resolvedIdentity.level,
    subject: identity.subjectName ?? identity.subjectId, syllabusId: resolvedIdentity.syllabusId, syllabusVersion: resolvedIdentity.syllabusVersion,
    objectives: result.context.objectives.map((objective) => ({ id: objective.id, code: objective.code, statement: objective.statement })),
    knowledge: usefulKnowledge.map((item) => ({ id: item.id, kind: item.kind, code: item.code, title: item.title, content: item.content, topicCode: item.topicCode, objectiveIds: item.objectiveIds, parentId: item.parentId, metadata: item.metadata })),
    promptContext: [
      "\n\n=== VERIFIED LEARNER CURRICULUM CONTEXT ===",
      curriculumSystemPromptContext(result.context),
      `Canonical topic resolved from learner input: ${effectiveTopic}`,
      "Authoritative syllabus objectives. The lesson must first map the requested topic to these objectives:",
      ...objectiveLines,
      "Topic-level grounding:", learnCurriculumPromptSection(topicGrounding),
      "Verified syllabus knowledge available to the lesson generator:",
      ...(knowledgeLines.length ? knowledgeLines : ["- No verified knowledge matched this topic. Do not fabricate a syllabus lesson from unrelated material."]),
      "Curriculum rule: objectives are the scope gate. Teach the requested topic only insofar as it supports the verified objectives. Use verified knowledge for explanations, examples, terminology, assessment style and scope. Never claim missing or unverified material is required by this syllabus. If the requested topic is outside the verified objectives, clearly label it as enrichment rather than required syllabus content.",
      "=== END VERIFIED LEARNER CURRICULUM CONTEXT ===",
    ].join("\n"),
    cachedAt: new Date().toISOString(),
  };

  return {
    status: "resolved",
    reason: topicResolution.matched ? `Verified ${identity.subjectName ?? identity.subjectId} curriculum resolved automatically from learner profile. Topic normalized to “${effectiveTopic}”.` : "Verified curriculum resolved automatically from learner profile. The requested topic was not confidently normalized to a syllabus topic.",
    resolvedTopic: effectiveTopic,
    promptContext: pack.promptContext,
    pack,
  };
}

export async function getVerifiedCurriculumPromptContext(userId: string, prompt: string): Promise<string> {
  const result = await resolveVerifiedCurriculumPromptContext(userId, prompt);
  return result.status === "resolved" ? result.promptContext : "";
}
