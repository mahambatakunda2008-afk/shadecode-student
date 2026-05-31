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

export type LessonDifficulty = "easy" | "medium" | "hard";

export interface LearnSubject {
  id: string;
  name: string;
  lessonCount: number;
}

export interface LearnLesson {
  id: string;
  subjectId: string;
  subject: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  progress: number;
  completed: boolean;
}

export interface LearnSummary {
  currentXP: number;
  currentStreak: number;
  level: number;
  xpGoal: number;
}

export interface LearnListResponse {
  subjects: LearnSubject[];
  lessons: LearnLesson[];
  summary: LearnSummary;
}

export interface LearnDetailResponse {
  lesson: LearnLesson;
}
