import type { CurriculumResolution } from "@/lib/curriculum/resolver";

export type LessonBlueprint = {
  subject: string;
  topic: string;
  stage: CurriculumResolution["stage"];
  board: CurriculumResolution["board"];
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
  sections: string[];
  practiceCount: number;
  visualRequired: boolean;
};

export function buildLessonBlueprint(curriculum: CurriculumResolution): LessonBlueprint {
  return {
    subject: curriculum.subject,
    topic: curriculum.topic ?? "Full syllabus",
    stage: curriculum.stage,
    board: curriculum.board,
    qualification: curriculum.qualification,
    syllabusCode: curriculum.syllabusCode,
    syllabusYear: curriculum.syllabusYear,
    sections: [
      "prerequisites", "definitions", "principles", "relationships",
      "worked_examples", "applications", "misconceptions", "exam_skills",
      "retrieval", "transfer", "curiosity",
    ],
    practiceCount: 5,
    visualRequired: ["Physics", "Chemistry", "Biology", "Mathematics", "Computer Science"].includes(curriculum.subject),
  };
}

export function renderLessonBlueprint(blueprint: LessonBlueprint): string {
  const scope = [
    blueprint.stage,
    blueprint.board,
    blueprint.qualification,
    blueprint.syllabusCode ? `syllabus ${blueprint.syllabusCode}` : undefined,
    blueprint.syllabusYear,
  ].filter(Boolean).join(" | ");

  return [
    "LESSON BLUEPRINT (follow this plan; do not expose it to the student)",
    `Academic scope: ${scope}`,
    `Subject: ${blueprint.subject}`,
    `Topic: ${blueprint.topic}`,
    `Required sections: ${blueprint.sections.join(", ")}`,
    `Practice questions: ${blueprint.practiceCount}`,
    `Visual required when pedagogically useful: ${blueprint.visualRequired ? "yes" : "no"}`,
    "Stay within the stated academic scope. Do not invent syllabus requirements or pretend an unsupported visual is exact.",
  ].join("\n");
}
