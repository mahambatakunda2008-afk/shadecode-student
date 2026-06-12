/**
 * /lib/languages/types.ts
 *
 * Types for indigenous language learning
 */

export type IndigenousLanguage = "shona" | "ndebele";

export type LessonType = "grammar" | "comprehension" | "literature" | "vocabulary" | "idioms" | "exam-prep";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface GrammarLesson {
  id: string;
  language: IndigenousLanguage;
  title: string;
  topic: string;
  difficulty: DifficultyLevel;
  explanation: string;
  examples: GrammarExample[];
  exercises: GrammarExercise[];
  culturalContext?: string;
}

export interface GrammarExample {
  correct: string;
  incorrect?: string;
  explanation: string;
  translation?: string;
}

export interface GrammarExercise {
  type: "fill-blank" | "multiple-choice" | "translation" | "sentence-building";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ComprehensionPassage {
  id: string;
  language: IndigenousLanguage;
  title: string;
  content: string;
  difficulty: DifficultyLevel;
  questions: ComprehensionQuestion[];
  vocabulary: VocabularyItem[];
}

export interface ComprehensionQuestion {
  id: string;
  question: string;
  type: "literal" | "inferential" | "vocabulary";
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface VocabularyItem {
  word: string;
  pronunciation?: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
}

export interface LiteratureWork {
  id: string;
  language: IndigenousLanguage;
  title: string;
  author: string;
  type: "prose" | "poetry" | "drama" | "folklore";
  period: string;
  excerpt: string;
  themes: string[];
  analysis: LiteratureAnalysis;
  questions: LiteratureQuestion[];
}

export interface LiteratureAnalysis {
  summary: string;
  themes: string[];
  literaryDevices: string[];
  culturalSignificance: string;
}

export interface LiteratureQuestion {
  id: string;
  question: string;
  type: "understanding" | "analysis" | "context" | "evaluation";
  correctAnswer: string;
  explanation: string;
}

export interface Idiom {
  id: string;
  language: IndigenousLanguage;
  phrase: string;
  literalMeaning: string;
  figurativeMeaning: string;
  example: string;
  usage: string;
  culturalContext?: string;
}

export interface Proverb {
  id: string;
  language: IndigenousLanguage;
  proverb: string;
  meaning: string;
  context: string;
  application: string;
  culturalSignificance: string;
}

export interface ExamQuestion {
  id: string;
  language: IndigenousLanguage;
  subject: string;
  type: "multiple-choice" | "short-answer" | "essay" | "translation";
  question: string;
  options?: string[];
  correctAnswer: string;
  marks: number;
  explanation: string;
  pastPaper?: string;
  year?: number;
}

export interface LanguageLessonRequest {
  language: IndigenousLanguage;
  lessonType: LessonType;
  topic: string;
  difficulty: DifficultyLevel;
  studentLevel?: DifficultyLevel;
  previousContext?: any[];
}

export interface LanguageLessonResponse {
  lesson: GrammarLesson | ComprehensionPassage | LiteratureWork | VocabularyItem[] | Idiom[] | Proverb[] | ExamQuestion[];
  type: LessonType;
  language: IndigenousLanguage;
  metadata: {
    difficulty: DifficultyLevel;
    estimatedTime: number;
    objectives: string[];
  };
}
