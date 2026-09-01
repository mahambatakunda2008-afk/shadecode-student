export type ExamQuestion = {
  id: number;
  type: "multiple_choice" | "short_answer" | "structured" | "essay";
  question: string;
  options?: string[];
  marks: number;
  topic: string;
  modelAnswer?: string;
  markingCriteria?: string;
};

export type ExamAnswer = { questionId: number; answer: string; timeSpent: number };

export type ExamResult = {
  questionId: number;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
  modelAnswer: string;
  topic: string;
  timeSpent?: number;
};

export type ExamResults = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  cortexInsight: string;
  results: ExamResult[];
  timeTaken: number;
  source?: "local-deterministic" | "server";
};
