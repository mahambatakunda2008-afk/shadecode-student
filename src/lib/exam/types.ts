import type { NumericSpec } from "./engine/numeric";
import type { MarkingResourceEvidence } from "@/lib/cortex/verify/marking-resource";

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
  /** Rights-cleared, reviewed resource rubric. Raw AI-generated keys are never accepted. */
  syllabusIdentity?: MarkingResourceEvidence["syllabusIdentity"];
  offlineMarking?: {
    version: 1;
    criteria: Array<{ id: string; description: string; marks: number; acceptedAnswers: string[] }>;
    source: MarkingResourceEvidence;
    reviewerId: string;
    reviewedAt: string;
    limitations: string[];
  };
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
  /** Selected inside ExamWorkspace, including when the parent route started in general mode. */
  subject?: string;
  topic?: string;
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
