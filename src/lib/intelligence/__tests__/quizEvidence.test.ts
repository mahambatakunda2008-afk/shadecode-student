import { describe, expect, it } from "vitest";
import { buildQuizCompletionEvidence, buildQuizQuestionEvidence } from "../quizEvidence";

describe("quiz evidence builders", () => {
  it("creates one deterministic question event per answer", () => {
    const events = buildQuizQuestionEvidence("attempt-1", "lesson-7", [
      { questionId: "q1", correct: true, score: 100, maxScore: 100, questionIndex: 0 },
      { questionId: "q2", correct: false, score: 0, maxScore: 100, questionIndex: 1 },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      source: "learn-quiz",
      sourceEventId: "question-attempt:attempt-1:q1",
      type: "question.attempted",
      entityId: "q1",
      attemptId: "attempt-1",
    });
    expect(events[0].metadata).toMatchObject({ lessonId: "lesson-7", correct: true, percentage: 100 });
    expect(events[1].metadata).toMatchObject({ correct: false, percentage: 0 });
  });

  it("keeps retakes distinct while remaining replay-safe within an attempt", () => {
    const first = buildQuizQuestionEvidence("attempt-1", "lesson-7", [{ questionId: "q1", correct: true }]);
    const second = buildQuizQuestionEvidence("attempt-2", "lesson-7", [{ questionId: "q1", correct: true }]);

    expect(first[0].sourceEventId).not.toBe(second[0].sourceEventId);
    expect(first[0].sourceEventId).toBe("question-attempt:attempt-1:q1");
  });

  it("creates an aggregate-only completion event", () => {
    const event = buildQuizCompletionEvidence({
      quizAttemptId: "attempt-1",
      lessonId: "lesson-7",
      percentage: 83.333,
      questionCount: 6,
      correctCount: 5,
    });

    expect(event).toMatchObject({
      source: "learn-quiz",
      sourceEventId: "quiz-complete:attempt-1",
      type: "quiz.completed",
      entityId: "lesson-7",
      attemptId: "attempt-1",
    });
    expect(event.metadata).toMatchObject({
      lessonId: "lesson-7",
      percentage: 83.333,
      questionCount: 6,
      correctCount: 5,
      aggregateOnly: true,
    });
  });

  it("normalizes invalid aggregate values safely", () => {
    const event = buildQuizCompletionEvidence({
      quizAttemptId: "attempt-2",
      lessonId: "lesson-8",
      percentage: 200,
      questionCount: -2.7,
      correctCount: -1,
    });

    expect(event.metadata).toMatchObject({ percentage: 100, questionCount: 0, correctCount: 0 });
  });
});
