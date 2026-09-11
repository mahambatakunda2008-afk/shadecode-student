export type CodeLabCurriculumIdentity = {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId?: string | null;
};

export type CodeLabObjective = {
  id: string;
  objective_key: string;
  parent_key: string | null;
  topic: string | null;
  title: string;
  description: string | null;
  education_level: string | null;
  paper_component: string | null;
  status: "draft" | "verified" | "archived";
};

export type CodeLabExercise = {
  exerciseId: string;
  objectiveId: string;
  objectiveKey: string;
  curriculum: CodeLabCurriculumIdentity | null;
  title: string;
  prompt: string;
  starterCode: string;
  expectedBehaviour: string;
  difficulty: number;
  hints: string[];
  skill: string;
};
