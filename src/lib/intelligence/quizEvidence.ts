import type { LearningEventInput } from "./emitLearningEvent";

export type QuizQuestionEvidence = {
  questionId: string | number;
  correct: boolean;
  score?: number;
  maxScore?: number;
  percentage?: number;
  questionIndex?: number;
};

export type QuizCompletionEvidence = {
  quizAttemptId: string;
  lessonId: string;
  percentage: number;
  questionCount: number;
  correctCount: number;
};

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Builds durable question-level evidence for a single quiz attempt.
 * The attempt ID makes retakes distinct while the question ID makes each
 * answer replay-safe within that attempt.
 */
export function buildQuizQuestionEvidence(
  quizAttemptId: string,
  lessonId: string,
  results: QuizQuestionEvidence[],
): LearningEventInput[] {
  return results.map((result, index) => {
    const score = Number.isFinite(result.score) ? result.score! : result.correct ? 100 : 0;
    const maxScore = Number.isFinite(result.maxScore) && result.maxScore! > 0 ? result.maxScore! : 100;
    const percentage = clampPercentage(
      Number.isFinite(result.percentage) ? result.percentage! : (score / maxScore) * 100,
    );

    return {
      source: "learn-quiz",
      sourceEventId: `question-attempt:${quizAttemptId}:${String(result.questionId)}`,
      type: "question.attempted",
      entityId: String(result.questionId),
      attemptId: quizAttemptId,
      metadata: {
        lessonId,
        correct: result.correct,
        score,
        maxScore,
        percentage,
        questionIndex: result.questionIndex ?? index,
      },
    };
  });
}

/**
 * Builds one aggregate completion event. It is explicitly aggregate-only so
 * the quiz result cannot double-count the question-level evidence above.
 */
export function buildQuizCompletionEvidence(input: QuizCompletionEvidence): LearningEventInput {
  return {
    source: "learn-quiz",
    sourceEventId: `quiz-complete:${input.quizAttemptId}`,
    type: "quiz.completed",
    entityId: input.lessonId,
    attemptId: input.quizAttemptId,
    metadata: {
      lessonId: input.lessonId,
      percentage: clampPercentage(input.percentage),
      questionCount: Math.max(0, Math.trunc(input.questionCount)),
      correctCount: Math.max(0, Math.trunc(input.correctCount)),
      aggregateOnly: true,
    },
  };
}
