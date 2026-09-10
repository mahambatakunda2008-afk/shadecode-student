import { createClient } from "@supabase/supabase-js";
import { normalizeStoredCurriculumIdentities, toLearnerCurriculumContext } from "./user-profile";
import { resolveSystemCurriculum } from "./system-resolver";
import type { CurriculumKnowledgeItem } from "./knowledge";
import type { CurriculumObjective, ObjectiveSkillMapping } from "./objective-first";
import type { CurriculumVersionRecord } from "./resolver";
import { curriculumSystemPromptContext } from "./system-curriculum-context";
import { buildLearnCurriculumGrounding, learnCurriculumPromptSection } from "./learn-grounding";

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
  | { status: "none"; promptContext: ""; reason: string }
  | { status: "resolved"; promptContext: string; reason: string }
  | { status: "blocked"; promptContext: ""; reason: string };

/** Resolve the learner's exact curriculum before AI can claim syllabus alignment. */
export async function resolveVerifiedCurriculumPromptContext(
  userId: string,
  prompt: string,
): Promise<VerifiedCurriculumPromptResult> {
  const supabase = adminClient();
  if (!supabase || !userId) return { status: "none", promptContext: "", reason: "No curriculum service is configured." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("curriculum_subjects")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return { status: "none", promptContext: "", reason: "Curriculum profile could not be read." };

  const identities = normalizeStoredCurriculumIdentities(profile?.curriculum_subjects);
  if (!identities.length) {
    return { status: "none", promptContext: "", reason: "No verified curriculum identity is configured for this learner." };
  }

  const normalizedPrompt = prompt.toLowerCase();
  const identity = identities.find((item) => {
    const subject = (item.subjectName ?? item.subjectId).toLowerCase();
    return subject.length >= 4 && normalizedPrompt.includes(subject);
  }) ?? (identities.length === 1 ? identities[0] : null);
  if (!identity) {
    return { status: "blocked", promptContext: "", reason: "Select the subject attached to your curriculum before Cortex can apply syllabus-specific teaching." };
  }

  const learner = toLearnerCurriculumContext(identity);

  // curriculum_versions is keyed by board/qualification/syllabus/version/subject.
  // Level is carried by the learner identity because production does not store
  // a level column on this table.
  const versionsResult = await supabase
    .from("curriculum_versions")
    .select("*")
    .eq("board_id", identity.boardId)
    .eq("qualification_id", identity.qualificationId)
    .eq("syllabus_id", identity.syllabusId)
    .eq("syllabus_version", identity.syllabusVersion)
    .eq("subject_id", identity.subjectId);

  if (versionsResult.error) {
    return { status: "blocked", promptContext: "", reason: "Verified curriculum data could not be loaded, so syllabus-aligned teaching is temporarily blocked." };
  }

  const versions: CurriculumVersionRecord[] = (versionsResult.data ?? []).map((version) => ({
    id: version.id,
    identity: {
      boardId: version.board_id,
      qualificationId: version.qualification_id,
      level: identity.level,
      syllabusId: version.syllabus_id,
      syllabusVersion: version.syllabus_version,
      subjectId: version.subject_id,
      paperOrComponentId: undefined,
      examSession: undefined,
    },
    status: version.status,
    effectiveFrom: version.effective_from,
    effectiveTo: version.effective_to,
  }));
  const matchingVersion = versions.find((version) => version.status === "verified");
  if (!matchingVersion) {
    return { status: "blocked", promptContext: "", reason: "No verified curriculum version matches this learner's exact board, qualification, level, syllabus and subject." };
  }

  const [objectivesResult, mappingsResult, knowledgeResult] = await Promise.all([
    supabase.from("curriculum_objectives").select("*").eq("curriculum_version_id", matchingVersion.id),
    supabase.from("objective_skill_mappings").select("*"),
    supabase.from("curriculum_knowledge").select("*").eq("curriculum_version_id", matchingVersion.id),
  ]);

  if (objectivesResult.error || mappingsResult.error || knowledgeResult.error) {
    return { status: "blocked", promptContext: "", reason: "Verified curriculum data could not be loaded, so syllabus-aligned teaching is temporarily blocked." };
  }

  const result = resolveSystemCurriculum({
    learner,
    versions,
    objectives: (objectivesResult.data ?? []).map((objective) => ({
      id: objective.id,
      curriculum: {
        boardId: identity.boardId,
        qualificationId: identity.qualificationId,
        level: identity.level,
        syllabusId: identity.syllabusId,
        syllabusVersion: identity.syllabusVersion,
        subjectId: identity.subjectId,
        paperOrComponentId: objective.paper_component ?? undefined,
      },
      code: objective.objective_key,
      statement: objective.description ?? objective.title,
      status: objective.status,
      provenance: objective.provenance ?? {},
    })) as CurriculumObjective[],
    mappings: (mappingsResult.data ?? []).map((mapping) => ({
      objectiveId: mapping.objective_id,
      skillId: mapping.skill_id,
      status: mapping.mapping_status === "verified" ? "verified" : "draft",
      provenance: mapping.provenance ?? {},
    })) as ObjectiveSkillMapping[],
    knowledge: (knowledgeResult.data ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      code: item.knowledge_key ?? undefined,
      title: item.title,
      content: item.content,
      status: item.status,
      identity: {
        boardId: item.board_id,
        qualificationId: item.qualification_id,
        level: item.level,
        syllabusId: item.syllabus_id,
        syllabusVersion: item.syllabus_version,
        subjectId: item.subject_id,
        paperComponentId: item.paper_component_id ?? undefined,
      },
      provenance: item.provenance ?? {},
      parentId: item.parent_id ?? undefined,
      topicCode: item.topic_key ?? undefined,
      objectiveIds: item.objective_keys ?? [],
      metadata: item.metadata ?? {},
    })) as CurriculumKnowledgeItem[],
  });
  if (result.blocked || !result.context) return { status: "blocked", promptContext: "", reason: result.reason };

  const requestedTopic = extractRequestedTopic(prompt);
  const topicGrounding = buildLearnCurriculumGrounding(requestedTopic, result.context.knowledge.items);
  const usefulKnowledge = topicGrounding.items.length ? topicGrounding.items : result.context.knowledge.items.slice(0, 80);
  const knowledgeLines = usefulKnowledge.map((item) => {
    const code = item.code ? `[${item.code}] ` : "";
    return `- ${item.kind}: ${code}${item.title}${item.content ? ` | ${item.content.slice(0, 500)}` : ""}`;
  });
  const objectiveLines = result.context.objectives.map((objective) => `- ${objective.code}: ${objective.statement}`);

  return {
    status: "resolved",
    reason: "Verified objective-first curriculum context resolved.",
    promptContext: [
      "\n\n=== VERIFIED LEARNER CURRICULUM CONTEXT ===",
      curriculumSystemPromptContext(result.context),
      "Authoritative syllabus objectives. The lesson must first map the requested topic to these objectives:",
      ...objectiveLines,
      "Topic-level grounding:",
      learnCurriculumPromptSection(topicGrounding),
      "Verified syllabus knowledge available to the lesson generator:",
      ...knowledgeLines,
      "Curriculum rule: objectives are the scope gate. Teach the requested topic only insofar as it supports the verified objectives. Use verified knowledge for explanations, examples, terminology, assessment style and scope. Never claim missing or unverified material is required by this syllabus. If the requested topic is outside the verified objectives, clearly label it as enrichment rather than required syllabus content.",
      "=== END VERIFIED LEARNER CURRICULUM CONTEXT ===",
    ].join("\n"),
  };
}

export async function getVerifiedCurriculumPromptContext(userId: string, prompt: string): Promise<string> {
  const result = await resolveVerifiedCurriculumPromptContext(userId, prompt);
  return result.status === "resolved" ? result.promptContext : "";
}
