export interface Subject {
  id: string;
  name: string;
}

export interface StudyTopic {
  id: string;
  subject: string;
  topic: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface LessonBlock {
  type:
    | "intro"
    | "concept"
    | "example"
    | "tip"
    | "warning"
    | "summary"
    | "reflection"
    | "formula";

  title?: string;
  content: string;
  formula?: string;

  example?: {
    question: string;
    answer: string;
  };
}

export interface LessonResponse {
  blocks: LessonBlock[];
  xpReward: number;
  difficulty: "guided" | "standard" | "challenge";
}

export interface MathResult {
  problem: string;
  score: number;
  correct: boolean;
  cortexInsight: string;
  steps: {
    description: string;
    status: string;
    note?: string;
  }[];
}
