import type { CurriculumObjective } from "./objective-first";
import type { CurriculumKnowledgeBundle, CurriculumKnowledgeIdentity, CurriculumKnowledgeItem } from "./knowledge";

/**
 * System-wide curriculum context. This is deliberately not tied to Code Lab.
 * Learn, Exam Sim, Past Papers, Cortex, analytics, challenges, tutoring and
 * future modules can consume the same resolved curriculum intelligence.
 */
export interface SystemCurriculumContext {
  identity: CurriculumKnowledgeIdentity;
  objectives: CurriculumObjective[];
  knowledge: CurriculumKnowledgeBundle;
  required: CurriculumKnowledgeItem[];
  supporting: CurriculumKnowledgeItem[];
  assessment: CurriculumKnowledgeItem[];
  practical: CurriculumKnowledgeItem[];
  terminology: CurriculumKnowledgeItem[];
  provenanceWarnings: string[];
  /**
   * Set by the resolver. When explicitly `false`, past papers, mark schemes, examiner reports and grade thresholds for
   * this syllabus are NOT verified, and consumers must not make claims about them. `undefined` = not asserted.
   */
  examHistoryVerified?: boolean;
}

export function buildSystemCurriculumContext(
  identity: CurriculumKnowledgeIdentity,
  items: CurriculumKnowledgeItem[],
  verifiedOnly = true,
  objectives: CurriculumObjective[] = [],
  examHistoryVerified?: boolean,
): SystemCurriculumContext {
  const usable = items.filter((item) => {
    if (item.status === "archived") return false;
    if (!verifiedOnly) return true;
    return item.status === "verified" && item.provenance.mappingStatus === "verified";
  });

  const provenanceWarnings = items
    .filter((item) => item.provenance.versionConflict || item.provenance.versionSource === "unresolved")
    .map((item) => `${item.kind}:${item.code ?? item.title} requires syllabus-version verification.`);

  return {
    identity,
    objectives,
    knowledge: { identity, items: usable, verifiedOnly },
    required: usable.filter((item) => ["objective", "content_scope", "competency", "learning_outcome", "skill"].includes(item.kind)),
    supporting: usable.filter((item) => ["topic", "prerequisite", "progression", "resource", "guidance", "note", "constraint"].includes(item.kind)),
    assessment: usable.filter((item) => ["assessment_requirement", "assessment_weighting", "examination_format", "paper_component"].includes(item.kind)),
    practical: usable.filter((item) => ["practical_activity", "project_requirement"].includes(item.kind)),
    terminology: usable.filter((item) => item.kind === "terminology"),
    provenanceWarnings: [...new Set(provenanceWarnings)],
    ...(examHistoryVerified === undefined ? {} : { examHistoryVerified }),
  };
}

export function curriculumSystemPromptContext(context: SystemCurriculumContext): string {
  const { identity } = context;
  const objectiveLines = context.objectives.length
    ? context.objectives.map((objective) => `- ${objective.code}: ${objective.statement}`).join("\n")
    : "- No verified objectives are available.";

  return [
    `Board: ${identity.boardId}`,
    `Qualification: ${identity.qualificationId}`,
    `Level: ${identity.level}`,
    `Syllabus: ${identity.syllabusId}`,
    `Version: ${identity.syllabusVersion}`,
    `Subject: ${identity.subjectId}`,
    `Paper/component: ${identity.paperComponentId ?? "not specified"}`,
    `Verified curriculum objectives: ${context.objectives.length}`,
    "Verified syllabus objectives (authoritative scope):",
    objectiveLines,
    `Verified curriculum knowledge items: ${context.knowledge.items.length}`,
    "Rule: objectives are the first scope gate. Use knowledge only to teach, explain or assess against the verified objectives. Do not turn supporting knowledge into a new syllabus requirement.",
    "Rule: do not present unverified or unmapped curriculum claims as required content.",
    ...(context.examHistoryVerified === false
      ? [
          "Rule: past papers, mark schemes, examiner reports and grade thresholds for this syllabus are NOT verified. Do not cite specific past papers, question numbers, mark-scheme wording, examiner comments, grade boundaries or pass rates, and do not claim what typically appears in past exams. Describe assessment only from the verified syllabus knowledge above (papers, weightings, format, command words).",
        ]
      : []),
  ].join("\n");
}
