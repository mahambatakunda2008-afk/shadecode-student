import type { NumericSpec } from "./engine/numeric";

export type ExamDiagramShape =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; label?: string }
  | { type: "rect"; x: number; y: number; width: number; height: number; label?: string }
  | { type: "circle"; cx: number; cy: number; r: number; label?: string }
  | { type: "text"; x: number; y: number; text: string };

export type ExamContentBlock =
  | { type: "text"; text: string }
  | { type: "table"; caption?: string; headers: string[]; rows: string[][] }
  | { type: "graph"; caption?: string; xLabel: string; yLabel: string; points: Array<{ x: number; y: number }> }
  | { type: "diagram"; caption?: string; shapes: ExamDiagramShape[] };

export type ExamQuestion = {
  id: number;
  type: "multiple_choice" | "short_answer" | "structured" | "essay";
  question: string;
  options?: string[];
  marks: number;
  topic: string;
  modelAnswer?: string;
  markingCriteria?: string;
  numeric?: NumericSpec;
  /** Optional typed visual/content blocks. Treat provider-supplied data as untrusted. */
  content?: ExamContentBlock[];
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
  /** The known mistake this wrong answer matched, when the deterministic marker diagnosed one. */
  mistakeId?: string;
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
  /** Battle results marked by the server against the private key. */
  won?: boolean;
  verified?: boolean;
};