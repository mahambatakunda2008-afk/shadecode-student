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

export interface TutoringRequest {
  userId: string;
  subject: string;
  topic: string;
  question: string;
  studentLevel?: "beginner" | "intermediate" | "advanced";
  previousContext?: TutoringMessage[];
}

export interface TutoringResponse {
  message: TutoringMessage;
  hints?: Hint[];
  reasoningSteps?: ReasoningStep[];
  errorAnalysis?: ErrorAnalysis;
  conceptReinforcement?: ConceptReinforcement;
  suggestedNextQuestion?: string;
}
