/**
 * /lib/cortex/templates.ts
 *
 * Lesson Template System for Structured Content Generation
 *
 * Responsibility:
 * - Define reusable lesson structure templates
 * - Create lesson blueprints (explanation, practice, quiz)
 * - Ensure consistent format for AI-generated content
 */

export interface Section {
  heading: string;
  content: string;
  examples?: Example[];
  keyPoints?: string[];
}

export interface Example {
  title: string;
  description: string;
  code?: string;
  solution?: string;
}

export interface PracticeItem {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer" | "fill_blank";
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizItem {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer" | "essay";
  options?: string[];
  correctAnswer: string;
  maxPoints: number;
  rubric?: string;
}

export interface LessonMetadata {
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: number; // minutes
  concepts: string[];
  prerequisites?: string[];
  objectives: string[];
  tags?: string[];
}

export interface StructuredLesson {
  id?: string;
  title: string;
  topic: string;
  content: {
    explanation: Section[];
    examples: Example[];
    keyPoints: string[];
    practice: PracticeItem[];
  };
  assessment?: QuizItem[];
  metadata: LessonMetadata;
  createdAt?: Date;
}

export interface ExplanationTemplate extends StructuredLesson {
  type: "explanation";
}

export interface PracticeTemplate extends StructuredLesson {
  type: "practice";
}

export interface QuizTemplate extends StructuredLesson {
  type: "quiz";
}

/**
 * Create a standard explanation lesson template
 * Format: Introduction → Detailed explanation → Examples → Key points → Summary
 */
export function createExplanationTemplate(topic: string, level: string): ExplanationTemplate {
  return {
    type: "explanation",
    title: `Understanding ${topic}`,
    topic,
    content: {
      explanation: [
        {
          heading: "Introduction",
          content: "",
          keyPoints: [],
        },
        {
          heading: "Core Concepts",
          content: "",
          keyPoints: [],
        },
        {
          heading: "Deep Dive",
          content: "",
          examples: [],
          keyPoints: [],
        },
        {
          heading: "Summary",
          content: "",
          keyPoints: [],
        },
      ],
      examples: [],
      keyPoints: [],
      practice: [],
    },
    metadata: {
      difficulty: (level as "beginner" | "intermediate" | "advanced") || "intermediate",
      estimatedTime: 15,
      concepts: [topic],
      objectives: [
        `Understand the fundamentals of ${topic}`,
        `Apply ${topic} in real-world scenarios`,
      ],
    },
  };
}

/**
 * Create a practice lesson template
 * Format: Theory recap → Guided examples → Practice problems → Solutions
 */
export function createPracticeTemplate(topic: string, level: string): PracticeTemplate {
  return {
    type: "practice",
    title: `Practice: ${topic}`,
    topic,
    content: {
      explanation: [
        {
          heading: "Quick Review",
          content: "",
          keyPoints: [],
        },
      ],
      examples: [],
      keyPoints: [],
      practice: [],
    },
    assessment: [],
    metadata: {
      difficulty: (level as "beginner" | "intermediate" | "advanced") || "intermediate",
      estimatedTime: 20,
      concepts: [topic],
      objectives: [
        `Apply ${topic} concepts through practice`,
        `Build proficiency with ${topic}`,
      ],
    },
  };
}

/**
 * Create a quiz/assessment template
 * Format: Questions with varying difficulty → Clear grading → Feedback
 */
export function createQuizTemplate(topic: string, level: string): QuizTemplate {
  return {
    type: "quiz",
    title: `Assessment: ${topic}`,
    topic,
    content: {
      explanation: [],
      examples: [],
      keyPoints: [],
      practice: [],
    },
    assessment: [],
    metadata: {
      difficulty: (level as "beginner" | "intermediate" | "advanced") || "intermediate",
      estimatedTime: 15,
      concepts: [topic],
      objectives: [`Assess mastery of ${topic}`],
    },
  };
}

/**
 * Validate lesson structure completeness
 */
export function validateLessonStructure(lesson: StructuredLesson): boolean {
  if (!lesson.title || !lesson.topic) return false;
  if (!lesson.content || !lesson.metadata) return false;
  if (!lesson.metadata.difficulty || !lesson.metadata.concepts) return false;
  if (lesson.content.explanation.length === 0) return false;
  if (lesson.metadata.objectives.length === 0) return false;

  return true;
}

/**
 * Get template field count for partial completion tracking
 */
export function getTemplateFieldCount(lesson: StructuredLesson): {
  total: number;
  filled: number;
  percentage: number;
} {
  let filled = 0;
  let total = 0;

  // Count explanation sections
  total += lesson.content.explanation.length;
  filled += lesson.content.explanation.filter((s) => s.content.trim().length > 0).length;

  // Count examples
  total += lesson.content.examples.length;
  filled += lesson.content.examples.length;

  // Count key points
  total += lesson.content.keyPoints.length;
  filled += lesson.content.keyPoints.length;

  // Count practice items
  total += lesson.content.practice.length;
  filled += lesson.content.practice.length;

  // Count assessment items
  total += lesson.assessment?.length || 0;
  filled += lesson.assessment?.length || 0;

  return {
    total: Math.max(total, 1),
    filled,
    percentage: Math.round((filled / Math.max(total, 1)) * 100),
  };
}

/**
 * Template presets by difficulty level
 */
export const TEMPLATE_PRESETS = {
  beginner: {
    explanationSections: 3,
    examplesPerSection: 1,
    practiceItems: 3,
    quizItems: 3,
    estimatedTime: 15,
  },
  intermediate: {
    explanationSections: 4,
    examplesPerSection: 2,
    practiceItems: 5,
    quizItems: 5,
    estimatedTime: 25,
  },
  advanced: {
    explanationSections: 5,
    examplesPerSection: 3,
    practiceItems: 8,
    quizItems: 8,
    estimatedTime: 35,
  },
};
