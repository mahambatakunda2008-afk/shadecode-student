/**
 * /lib/cortex/validators.ts
 *
 * Response Validation & Sanitization
 *
 * Responsibility:
 * - Validate AI-generated content against schemas
 * - Detect & correct malformed responses
 * - Sanitize content for safety
 * - Report validation results
 */

import type { StructuredLesson, Section, PracticeItem, QuizItem } from "./templates";

export interface ValidationError {
  field: string;
  error: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number; // 0-100
}

/**
 * Validate complete lesson structure
 */
export function validateLessonStructure(lesson: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let score = 100;

  // Check required fields
  if (!lesson.title || typeof lesson.title !== "string" || lesson.title.trim().length === 0) {
    errors.push({
      field: "title",
      error: "Title is required and must be a non-empty string",
      severity: "error",
    });
    score -= 20;
  }

  if (!lesson.topic || typeof lesson.topic !== "string" || lesson.topic.trim().length === 0) {
    errors.push({
      field: "topic",
      error: "Topic is required and must be a non-empty string",
      severity: "error",
    });
    score -= 20;
  }

  // Check content structure
  if (!lesson.content || typeof lesson.content !== "object") {
    errors.push({
      field: "content",
      error: "Content must be an object",
      severity: "error",
    });
    score -= 30;
  } else {
    // Validate content sections
    if (!Array.isArray(lesson.content.explanation) || lesson.content.explanation.length === 0) {
      errors.push({
        field: "content.explanation",
        error: "At least one explanation section is required",
        severity: "error",
        suggestion: "Add explanation sections with headings and content",
      });
      score -= 15;
    } else {
      // Validate each explanation section
      lesson.content.explanation.forEach((section: any, index: number) => {
        if (!section.heading || section.heading.trim().length === 0) {
          errors.push({
            field: `content.explanation[${index}].heading`,
            error: `Section ${index + 1} heading is required`,
            severity: "error",
          });
          score -= 5;
        }
        if (!section.content || section.content.trim().length === 0) {
          warnings.push({
            field: `content.explanation[${index}].content`,
            error: `Section ${index + 1} has empty content`,
            severity: "warning",
            suggestion: "Add content to this section",
          });
          score -= 3;
        }
      });
    }

    // Check for key points
    if (!Array.isArray(lesson.content.keyPoints) || lesson.content.keyPoints.length === 0) {
      warnings.push({
        field: "content.keyPoints",
        error: "Consider adding key points for better learning",
        severity: "warning",
        suggestion: "Add 3-5 key points summarizing the lesson",
      });
      score -= 5;
    }

    // Check examples
    if (!Array.isArray(lesson.content.examples)) {
      warnings.push({
        field: "content.examples",
        error: "Examples array is missing or invalid",
        severity: "warning",
        suggestion: "Add practical examples to reinforce concepts",
      });
      score -= 5;
    }

    // Check practice items
    if (!Array.isArray(lesson.content.practice) || lesson.content.practice.length === 0) {
      warnings.push({
        field: "content.practice",
        error: "No practice items included",
        severity: "warning",
        suggestion: "Add practice questions for student engagement",
      });
      score -= 5;
    }
  }

  // Check metadata
  if (!lesson.metadata || typeof lesson.metadata !== "object") {
    errors.push({
      field: "metadata",
      error: "Metadata must be an object",
      severity: "error",
    });
    score -= 20;
  } else {
    if (!lesson.metadata.difficulty || !["beginner", "intermediate", "advanced"].includes(lesson.metadata.difficulty)) {
      errors.push({
        field: "metadata.difficulty",
        error: 'Difficulty must be one of: "beginner", "intermediate", "advanced"',
        severity: "error",
      });
      score -= 10;
    }

    if (typeof lesson.metadata.estimatedTime !== "number" || lesson.metadata.estimatedTime <= 0) {
      warnings.push({
        field: "metadata.estimatedTime",
        error: "Estimated time should be a positive number",
        severity: "warning",
        suggestion: "Set realistic time estimate in minutes",
      });
      score -= 5;
    }

    if (!Array.isArray(lesson.metadata.concepts) || lesson.metadata.concepts.length === 0) {
      errors.push({
        field: "metadata.concepts",
        error: "At least one concept must be specified",
        severity: "error",
      });
      score -= 10;
    }

    if (!Array.isArray(lesson.metadata.objectives) || lesson.metadata.objectives.length === 0) {
      errors.push({
        field: "metadata.objectives",
        error: "At least one learning objective must be specified",
        severity: "error",
      });
      score -= 10;
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(score, 0);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}

/**
 * Validate a single section
 */
export function validateSection(section: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!section.heading || section.heading.trim().length === 0) {
    errors.push({
      field: "heading",
      error: "Section heading is required",
      severity: "error",
    });
  }

  if (!section.content || section.content.trim().length < 10) {
    errors.push({
      field: "content",
      error: "Section content is too short (minimum 10 characters)",
      severity: "error",
      suggestion: "Provide more detailed content",
    });
  }

  return errors;
}

/**
 * Validate a practice item
 */
export function validatePracticeItem(item: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!item.question || item.question.trim().length === 0) {
    errors.push({
      field: "question",
      error: "Question is required",
      severity: "error",
    });
  }

  if (!item.type || !["multiple_choice", "short_answer", "fill_blank"].includes(item.type)) {
    errors.push({
      field: "type",
      error: "Invalid question type",
      severity: "error",
    });
  }

  if (item.type === "multiple_choice" && (!Array.isArray(item.options) || item.options.length < 2)) {
    errors.push({
      field: "options",
      error: "Multiple choice questions require at least 2 options",
      severity: "error",
    });
  }

  if (!item.correctAnswer || item.correctAnswer.trim().length === 0) {
    errors.push({
      field: "correctAnswer",
      error: "Correct answer is required",
      severity: "error",
    });
  }

  if (!item.explanation || item.explanation.trim().length === 0) {
    errors.push({
      field: "explanation",
      error: "Explanation is required for learning purposes",
      severity: "error",
    });
  }

  return errors;
}

/**
 * Sanitize text content for safety
 */
export function sanitizeContent(content: string): string {
  if (typeof content !== "string") {
    return "";
  }

  // Remove potentially dangerous HTML/scripts
  let sanitized = content
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");

  // Remove excessive whitespace
  sanitized = sanitized
    .replace(/\n\n\n+/g, "\n\n")
    .replace(/\t\t+/g, "\t")
    .trim();

  return sanitized;
}

/**
 * Sanitize entire lesson
 */
export function sanitizeLesson(lesson: StructuredLesson): StructuredLesson {
  return {
    ...lesson,
    title: sanitizeContent(lesson.title),
    topic: sanitizeContent(lesson.topic),
    content: {
      explanation: lesson.content.explanation.map((section) => ({
        ...section,
        heading: sanitizeContent(section.heading),
        content: sanitizeContent(section.content),
        keyPoints: section.keyPoints?.map((p) => sanitizeContent(p)) || [],
        examples: section.examples?.map((e) => ({
          ...e,
          title: sanitizeContent(e.title),
          description: sanitizeContent(e.description),
          code: e.code ? sanitizeContent(e.code) : undefined,
          solution: e.solution ? sanitizeContent(e.solution) : undefined,
        })) || [],
      })),
      examples: lesson.content.examples.map((e) => ({
        ...e,
        title: sanitizeContent(e.title),
        description: sanitizeContent(e.description),
        code: e.code ? sanitizeContent(e.code) : undefined,
        solution: e.solution ? sanitizeContent(e.solution) : undefined,
      })),
      keyPoints: lesson.content.keyPoints.map((p) => sanitizeContent(p)),
      practice: lesson.content.practice.map((p) => ({
        ...p,
        question: sanitizeContent(p.question),
        options: p.options?.map((o) => sanitizeContent(o)),
        correctAnswer: sanitizeContent(p.correctAnswer),
        explanation: sanitizeContent(p.explanation),
      })),
    },
  };
}

/**
 * Check response completeness
 */
export interface CompletenessReport {
  isComplete: boolean;
  missingFields: string[];
  coverage: number; // 0-100
  suggestions: string[];
}

export function checkCompleteness(lesson: StructuredLesson): CompletenessReport {
  const missing: string[] = [];
  let coverage = 0;
  const suggestions: string[] = [];

  // Check explanation sections
  if (lesson.content.explanation.length === 0) {
    missing.push("No explanation sections");
    suggestions.push("Add at least 3 explanation sections");
  } else {
    coverage += 20;
  }

  // Check examples
  if (lesson.content.examples.length === 0) {
    missing.push("No examples provided");
    suggestions.push("Add 2-3 practical examples");
  } else {
    coverage += 15;
  }

  // Check key points
  if (lesson.content.keyPoints.length === 0) {
    missing.push("No key points summarized");
    suggestions.push("Add 3-5 key takeaways");
  } else {
    coverage += 15;
  }

  // Check practice
  if (lesson.content.practice.length === 0) {
    missing.push("No practice questions");
    suggestions.push("Add 3-5 practice problems");
  } else {
    coverage += 20;
  }

  // Check assessment
  if (!lesson.assessment || lesson.assessment.length === 0) {
    missing.push("No assessment/quiz");
    suggestions.push("Add a quiz to test understanding");
  } else {
    coverage += 15;
  }

  // Check metadata
  if (!lesson.metadata || Object.keys(lesson.metadata).length < 4) {
    missing.push("Incomplete metadata");
    suggestions.push("Ensure all metadata fields are filled");
  } else {
    coverage += 15;
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
    coverage: Math.min(coverage, 100),
    suggestions,
  };
}

/**
 * Get validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid) {
    return `✓ Valid (Score: ${result.score}/100)`;
  }

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  return `✗ Invalid - ${errorCount} error(s), ${warningCount} warning(s) (Score: ${result.score}/100)`;
}
