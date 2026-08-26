import type { ExamBlueprint } from "./examBlueprint";

export function renderExamBlueprint(blueprint: ExamBlueprint): string {
  const skillMix = blueprint.skills.join(", ");
  const types = blueprint.questionTypes.join(", ");
  const diagrams = blueprint.includeDiagrams
    ? `Visual opportunities: ${blueprint.diagramTypes.join(", ")}. Use a visual when it genuinely improves assessment; when used, provide a complete diagram specification.`
    : "No diagram is required for this blueprint.";
  const curriculum = blueprint.curriculum;
  const curriculumScope = curriculum
    ? [
        `Academic stage: ${curriculum.stage || "not specified"}`,
        `Exam board: ${curriculum.board || "not specified"}`,
        `Qualification: ${curriculum.qualification || "not specified"}`,
        `Syllabus code: ${curriculum.syllabusCode || "not specified"}`,
        `Syllabus year: ${curriculum.syllabusYear || "not specified"}`,
      ].join("\n")
    : "Academic curriculum scope: not specified";

  return [
    "EXAM BLUEPRINT (follow this plan; do not expose the blueprint to the student)",
    curriculumScope,
    `Subject: ${blueprint.subject}`,
    `Topic: ${blueprint.topic || "Full syllabus"}`,
    `Difficulty: ${blueprint.difficulty}`,
    `Questions: ${blueprint.questionCount}`,
    `Target marks: ${blueprint.marksTarget}`,
    `Skills to cover: ${skillMix}`,
    `Question types to vary across: ${types}`,
    diagrams,
    "Use unfamiliar contexts where they improve discrimination, while remaining fully answerable from the stated curriculum and qualification.",
  ].join("\n");
}
