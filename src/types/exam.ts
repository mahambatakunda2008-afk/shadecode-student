export interface ExamQuestionResult {
  questionId: number;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
  modelAnswer: string;
  topic: string;
}

export interface ExamResults {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  cortexInsight: string;
  results: ExamQuestionResult[];
  timeTaken: number;
}
