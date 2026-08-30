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

export type DiagramKind =
  | "auto"
  | "flowchart"
  | "graph"
  | "geometry"
  | "forces"
  | "circuit"
  | "ray"
  | "wave"
  | "biology"
  | "chemistry"
  | "data_structure";

export interface DiagramBlock {
  kind: DiagramKind;
  title?: string;
  description?: string;
  /** Structured, renderer-safe diagram data. Never render arbitrary HTML/SVG from AI. */
  nodes?: Array<{ id: string; label: string; x?: number; y?: number; shape?: "box" | "circle" | "point" }>;
  edges?: Array<{ from: string; to: string; label?: string; directed?: boolean }>;
  labels?: Array<{ text: string; x?: number; y?: number }>;
  data?: Array<{ x: number; y: number; label?: string }>;
  equations?: string[];
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
    | "formula"
    | "diagram"
    | "checkpoint"
    | "practice";
  title?: string;
  content: string;
  formula?: string;
  diagram?: DiagramBlock;
  example?: { question: string; answer: string };
  options?: string[];
  answer?: string;
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
  steps: { description: string; status: string; note?: string }[];
}

export type LessonDifficulty = "easy" | "medium" | "hard";

export interface LearnSubject { id: string; name: string; lessonCount: number; }

export interface LearnLesson {
  id: string;
  subjectId: string;
  subject: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  progress: number;
  completed: boolean;
  blocks?: LessonBlock[];
}

export interface LearnSummary { currentXP: number; currentStreak: number; level: number; xpGoal: number; }
export interface LearnListResponse { subjects: LearnSubject[]; lessons: LearnLesson[]; summary: LearnSummary; }
export interface LearnDetailResponse { lesson: LearnLesson; }
