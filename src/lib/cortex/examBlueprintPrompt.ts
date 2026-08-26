import type { ExamBlueprint } from "./examBlueprint";

export function renderExamBlueprint(blueprint: ExamBlueprint): string {
  const skillMix = Object.entries(blueprint.skillMix)
    .filter(([, count]) => count > 0)
    .map(([skill, count]) => `${skill}: ${count}`)
    .join(", ");

  const types = blueprint.questionTypes.join(", ");
  const diagrams = blueprint.diagramTypes.length
    ? `Required visual opportunities: ${blueprint.diagramTypes.join(", ")}.`
    : "No diagram is required for this blueprint.";

  return [
    "EXAM BLUEPRINT (follow this plan; do not expose the blueprint to the student)",
    `Subject: ${blueprint.subject}`,
    `Topic: ${blueprint.topic || "Full syllabus"}`,
    `Difficulty: ${blueprint.difficulty}`,
    `Questions: ${blueprint.questionCount}`,
    `Target marks: ${blueprint.targetMarks}`,
    `Skills: ${skillMix || "balanced application and reasoning"}`,
    `Question types: ${types}`,
    diagrams,
    `Use unfamiliar contexts where they improve discrimination, while remaining fully answerable from the stated curriculum.`,
  ].join("\n");
}
