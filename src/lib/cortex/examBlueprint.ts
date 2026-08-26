export type CurriculumScope = {
  stage?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  syllabusYear?: string | null;
};

export type ExamBlueprint = {
  subject: string;
  topic: string;
  difficulty: string;
  questionCount: number;
  skills: string[];
  questionTypes: string[];
  includeDiagrams: boolean;
  diagramTypes: string[];
  marksTarget: number;
  curriculum?: CurriculumScope;
};

const DIAGRAM_SUBJECTS = new Set(["physics", "mathematics", "chemistry", "biology", "geography"]);

export function buildExamBlueprint(input: {
  subject: string;
  topic?: string | null;
  difficulty: string;
  questionCount: number;
  curriculum?: CurriculumScope | null;
}): ExamBlueprint {
  const subject = input.subject.trim();
  const topic = (input.topic || subject).trim();
  const normalized = subject.toLowerCase();
  const count = Math.max(1, Math.min(40, input.questionCount));
  const includeDiagrams = DIAGRAM_SUBJECTS.has(normalized);

  const questionTypes = normalized === "mathematics"
    ? ["worked_problem", "multi_step", "interpretation", "proof_or_reasoning"]
    : normalized === "physics"
      ? ["calculation", "explanation", "data_interpretation", "diagram_interpretation"]
      : normalized === "chemistry"
        ? ["calculation", "explanation", "equation_or_structure", "data_interpretation"]
        : ["knowledge_application", "explanation", "data_interpretation", "extended_response"];

  const diagramTypes = normalized === "physics"
    ? ["force_diagram", "circuit", "graph", "ray_diagram"]
    : normalized === "mathematics"
      ? ["geometry", "graph", "coordinate_diagram"]
      : normalized === "chemistry"
        ? ["particle_model", "apparatus", "structure"]
        : normalized === "biology"
          ? ["labelled_biological_diagram", "process_flow", "graph"]
          : ["map", "graph", "labelled_diagram"];

  return {
    subject,
    topic,
    difficulty: input.difficulty,
    questionCount: count,
    skills: ["recall", "application", "reasoning", "interpretation"],
    questionTypes,
    includeDiagrams,
    diagramTypes,
    marksTarget: count * (input.difficulty.toLowerCase() === "hard" ? 4 : 2),
    curriculum: input.curriculum || undefined,
  };
}
