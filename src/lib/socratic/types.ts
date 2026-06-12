/**
 * /lib/socratic/types.ts
 *
 * Socratic Homework Helper Types
 *
 * Data structures for AI-powered Socratic tutoring
 */

export interface TutoringSession {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  question: string;
  conversation: TutoringMessage[];
  currentHintLevel: number;
  conceptsCovered: string[];
  studentLevel: "beginner" | "intermediate" | "advanced";
  createdAt: string;
  updatedAt: string;
}

export interface TutoringMessage {
  id: string;
  role: "tutor" | "student" | "system";
  content: string;
  type: "question" | "hint" | "guidance" | "feedback" | "explanation" | "reinforcement";
  timestamp: string;
  metadata?: {
    hintLevel?: number;
    conceptId?: string;
    errorType?: string;
    confidence?: number;
    explanationStyle?: ExplanationStyle;
    lessonId?: string;
  };
}

export interface Hint {
  level: number;
  content: string;
  isRevealing: boolean;
}

export interface ReasoningStep {
  stepNumber: number;
  description: string;
  isCompleted: boolean;
  studentResponse?: string;
  feedback?: string;
}

export interface ErrorAnalysis {
  errorType: "conceptual" | "calculation" | "misunderstanding" | "incomplete";
  description: string;
  suggestedQuestion: string;
  relatedConcepts: string[];
}

export interface ConceptReinforcement {
  conceptId: string;
  conceptName: string;
  explanation: string;
  examples: string[];
  practiceQuestions: string[];
  masteryLevel: number; // 0-100
}

export type ExplanationStyle = "simpler" | "detailed" | "real-world" | "analogy" | "exam-focused";

export interface LessonContext {
  lessonId: string;
  title: string;
  subject: string;
  description?: string;
  content?: string;
  blocks?: Array<{ type: string; content: string }>;
  difficulty?: string;
  completed?: boolean;
  progress?: number;
}

export interface TutoringRequest {
  userId: string;
  subject: string;
  topic: string;
  question: string;
  studentLevel?: "beginner" | "intermediate" | "advanced";
  previousContext?: TutoringMessage[];
  explanationStyle?: ExplanationStyle;
  lessonContext?: LessonContext;
}

export interface TutoringResponse {
  message: TutoringMessage;
  hints?: Hint[];
  reasoningSteps?: ReasoningStep[];
  errorAnalysis?: ErrorAnalysis;
  conceptReinforcement?: ConceptReinforcement;
  suggestedNextQuestion?: string;
}
