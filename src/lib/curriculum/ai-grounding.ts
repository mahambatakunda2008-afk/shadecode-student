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

/** Resolves the learner's exact curriculum and narrows verified syllabus knowledge to the request. */
export async function getVerifiedCurriculumPromptContext(userId: string, prompt: string): Promise<string> {
  const supabase = adminClient();
  if (!supabase || !userId) return "";
  const { data: profile, error: profileError } = await supabase.from("profiles").select("curriculum_subjects").eq("id", userId).maybeSingle();
  if (profileError) return "";

  const identities = normalizeStoredCurriculumIdentities(profile?.curriculum_subjects);
  if (!identities.length) return "";
  const normalizedPrompt = prompt.toLowerCase();
  const identity = identities.find((item) => {
    const subject = (item.subjectName ?? item.subjectId).toLowerCase();
    return subject.length >= 4 && normalizedPrompt.includes(subject);
  }) ?? (identities.length === 1 ? identities[0] : null);
  if (!identity) return "";

  const learner = toLearnerCurriculumContext(identity);
  const base = (table: string) => supabase.from(table).select("*")
    .eq("board_id", identity.boardId).eq("qualification_id", identity.qualificationId)
    .eq("level", identity.level).eq("syllabus_id", identity.syllabusId)
    .eq("syllabus_version", identity.syllabusVersion).eq("subject_id", identity.subjectId);
  const [versionsResult, objectivesResult, mappingsResult, knowledgeResult] = await Promise.all([
    base("curriculum_versions"), base("curriculum_objectives"),
    supabase.from("objective_skill_mappings").select("*"), base("curriculum_knowledge"),
  ]);
  if (versionsResult.error || objectivesResult.error || mappingsResult.error || knowledgeResult.error) return "";

  const result = resolveSystemCurriculum({
    learner,
    versions: (versionsResult.data ?? []) as CurriculumVersionRecord[],
    objectives: (objectivesResult.data ?? []) as CurriculumObjective[],
    mappings: (mappingsResult.data ?? []) as ObjectiveSkillMapping[],
    knowledge: (knowledgeResult.data ?? []) as CurriculumKnowledgeItem[],
  });
  if (result.blocked || !result.context) return "";

  const topicGrounding = buildLearnCurriculumGrounding(prompt, result.context.knowledge.items);
  const usefulKnowledge = topicGrounding.items.length ? topicGrounding.items : result.context.knowledge.items.slice(0, 80);
  const knowledgeLines = usefulKnowledge.map((item) => {
    const code = item.code ? `[${item.code}] ` : "";
    return `- ${item.kind}: ${code}${item.title}${item.content ? ` | ${item.content.slice(0, 500)}` : ""}`;
  });
  return [
    "\n\n=== VERIFIED LEARNER CURRICULUM CONTEXT ===",
    curriculumSystemPromptContext(result.context),
    "Topic-level grounding:",
    learnCurriculumPromptSection(topicGrounding),
    "Verified syllabus knowledge available to the lesson generator:",
    ...knowledgeLines,
    "Curriculum rule: use verified knowledge to constrain teaching, examples, terminology, assessment style and scope. Never claim missing or unverified material is required by this syllabus. If the requested topic is outside the verified curriculum, clearly label it as enrichment rather than required syllabus content.",
    "=== END VERIFIED LEARNER CURRICULUM CONTEXT ===",
  ].join("\n");
}
