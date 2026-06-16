import { z } from 'zod';

/**
 * Zod Validation Schemas for API Routes
 * Provides comprehensive input validation for all API endpoints
 */

// ============================================================================
// Cortex API Schemas
// ============================================================================

export const cortexApproveDraftSchema = z.object({
  id: z.string().uuid('Invalid draft ID'),
});

export const cortexRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.string().min(1, 'Type is required'),
  payload: z.record(z.string(), z.any()).optional(),
});

export const cortexBehaviorInsightSchema = z.object({
  requestType: z.literal('behavior.insight'),
  payload: z.object({
    userId: z.string().uuid('Invalid user ID'),
    events: z.array(z.any()).optional(),
    snapshot: z.record(z.string(), z.any()).optional(),
  }),
});

export const cortexCareersListSchema = z.object({
  type: z.literal('careers.list'),
});

export const cortexCareersGetSchema = z.object({
  type: z.literal('careers.get'),
  payload: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

// ============================================================================
// Learn API Schemas
// ============================================================================

export const learnCoursePreviewSchema = z.object({
  type: z.literal('course_preview'),
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  goal: z.string().min(1, 'Goal is required').max(500, 'Goal too long'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

export const learnGenerateLessonSchema = z.object({
  type: z.literal('generate_lesson'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject too long'),
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export const learnUpdateProgressSchema = z.object({
  type: z.literal('update_progress'),
  lessonId: z.string().uuid('Invalid lesson ID'),
  progress: z.number().min(0, 'Progress must be at least 0').max(100, 'Progress must be at most 100'),
});

// ============================================================================
// Exam Generate API Schemas
// ============================================================================

export const examGenerateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject too long'),
  topic: z.string().max(500, 'Topic too long').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionCount: z.number().int().min(1, 'At least 1 question required').max(50, 'Maximum 50 questions').default(10),
});

// ============================================================================
// Exam Mark API Schemas
// ============================================================================

export const examMarkSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject too long'),
  difficulty: z.string().optional(),
  questions: z.array(z.any()).min(1, 'At least 1 question required'),
  answers: z.array(z.any()).min(1, 'At least 1 answer required'),
  timeTaken: z.number().int().min(0, 'Time taken must be positive').optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
});

// ============================================================================
// Learn Quiz API Schemas
// ============================================================================

export const learnQuizSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
});

// ============================================================================
// Generate Revision API Schemas
// ============================================================================

export const generateRevisionSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
});

// ============================================================================
// Math Checker API Schemas
// ============================================================================

export const mathCheckerSchema = z.object({
  image: z.any(), // File validation handled separately
  topic: z.string().max(200, 'Topic too long').optional(),
  subject: z.string().max(100, 'Subject too long').optional(),
  question: z.string().max(1000, 'Question too long').optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate request body against a schema
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with success status and data or error
 */
export function validateRequestBody<T>(body: unknown, schema: z.ZodSchema<T>): {
  success: boolean;
  data?: T;
  error?: string;
  details?: z.ZodError;
} {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Create a validation error response
 * @param error - The Zod error
 * @returns Response object with validation error details
 */
export function createValidationErrorResponse(error: z.ZodError): Response {
  const errorMessages = error.issues.map((err: z.ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: errorMessages,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
