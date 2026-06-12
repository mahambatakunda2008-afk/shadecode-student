/**
 * /lib/exams/indigenous/types.ts
 *
 * Types for indigenous language examinations
 */

import { IndigenousLanguage as LangIndigenousLanguage } from "@/lib/languages/types";

export type IndigenousLanguage = LangIndigenousLanguage;

export type IndigenousExamType = "grammar" | "comprehension" | "vocabulary" | "literature" | "idioms" | "essay";

export interface IndigenousExamQuestion {
  id: string;
  language: IndigenousLanguage;
  type: IndigenousExamType;
  question: string;
  questionInLanguage?: string; // Question in the target language
  options?: string[];
  optionsInLanguage?: string[]; // Options in the target language
  correctAnswer: string;
  correctAnswerInLanguage?: string; // Correct answer in the target language
  marks: number;
  markingCriteria: MarkingCriteria;
  pastPaper?: string;
  year?: number;
}

export interface MarkingCriteria {
  keyPoints: string[];
  grammarWeight: number;
  contentWeight: number;
  culturalContextWeight: number;
  languageAccuracyWeight: number;
}

export interface IndigenousExamSubmission {
  examId: string;
  language: IndigenousLanguage;
  userId: string;
  answers: IndigenousExamAnswer[];
  submittedAt: string;
}

export interface IndigenousExamAnswer {
  questionId: string;
  answer: string;
  answerInLanguage?: string; // Answer in the target language
}

export interface IndigenousExamResult {
  submissionId: string;
  examId: string;
  language: IndigenousLanguage;
  userId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  feedback: IndigenousExamFeedback;
  questionResults: IndigenousQuestionResult[];
  completedAt: string;
}

export interface IndigenousExamFeedback {
  overall: string;
  overallInLanguage?: string; // Feedback in the target language
  strengths: string[];
  strengthsInLanguage?: string[];
  weaknesses: string[];
  weaknessesInLanguage?: string[];
  recommendations: string[];
  recommendationsInLanguage?: string[];
}

export interface IndigenousQuestionResult {
  questionId: string;
  obtainedMarks: number;
  totalMarks: number;
  feedback: string;
  feedbackInLanguage?: string;
  correctAnswer: string;
  correctAnswerInLanguage?: string;
}

export interface IndigenousExamPaper {
  id: string;
  language: IndigenousLanguage;
  title: string;
  titleInLanguage?: string;
  description: string;
  descriptionInLanguage?: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  questions: IndigenousExamQuestion[];
  pastPaper?: string;
  year?: number;
  level: "O-Level" | "A-Level" | "Form 1-2" | "Form 3-4";
}

export interface ComprehensionMarking {
  literalUnderstanding: number; // marks
  inferentialUnderstanding: number; // marks
  vocabulary: number; // marks
  grammar: number; // marks
  total: number; // marks
}

export interface VocabularyAssessment {
  wordMeaning: number; // marks
  pronunciation: number; // marks
  usage: number; // marks
  context: number; // marks
  total: number; // marks
}

export interface LiteratureAnalysisMarking {
  understanding: number; // marks
  analysis: number; // marks
  themes: number; // marks
  literaryDevices: number; // marks
  culturalContext: number; // marks
  total: number; // marks
}
