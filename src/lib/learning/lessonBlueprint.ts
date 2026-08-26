export type LessonBlueprint = {
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  curriculum?: {
    stage?: string | null;
    board?: string | null;
    qualification?: string | null;
    syllabusCode?: string | null;
    syllabusYear?: string | null;
  };
  requiredSections: string[];
  practiceCount: number;
  visualCount: number;
};

export function buildLessonBlueprint(input: {
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  curriculum?: LessonBlueprint["curriculum"];
}): LessonBlueprint {
  return {
    subject: input.subject.trim(),
    topic: input.topic.trim(),
    difficulty: input.difficulty,
    curriculum: input.curriculum,
    requiredSections: [
      "definition and prerequisites",
      "core explanation and relationships",
      "worked example or concrete application",
      "common misconception",
      "exam skill and transfer",
      "retrieval practice",
      "curiosity or extension",
    ],
    practiceCount: input.difficulty === "hard" ? 6 : 5,
    visualCount: /^(physics|mathematics|chemistry|biology|geography)$/i.test(input.subject) ? 1 : 0,
  };
}

export function renderLessonBlueprint(blueprint: LessonBlueprint): string {
  const curriculum = blueprint.curriculum;
  const scope = [
    curriculum?.stage && `Stage: ${curriculum.stage}`,
    curriculum?.board && `Board: ${curriculum.board}`,
    curriculum?.qualification && `Qualification: ${curriculum.qualification}`,
    curriculum?.syllabusCode && `Syllabus: ${curriculum.syllabusCode}`,
    curriculum?.syllabusYear && `Syllabus year: ${curriculum.syllabusYear}`,
  ].filter(Boolean).join(" | ");

  return [
    "LESSON BLUEPRINT (use this as the instructional plan; do not expose it to the student)",
    `Subject: ${blueprint.subject}`,
    `Topic: ${blueprint.topic}`,
    `Difficulty: ${blueprint.difficulty}`,
    scope ? `Curriculum scope: ${scope}` : "Curriculum scope: use the learner's resolved academic context.",
    `Required instructional coverage: ${blueprint.requiredSections.join("; ")}.`,
    `Practice questions required: ${blueprint.practiceCount}.`,
    `Useful visuals required: ${blueprint.visualCount}.`,
    "Do not introduce material outside the resolved curriculum merely to make the lesson sound advanced.",
  ].join("\n");
}
