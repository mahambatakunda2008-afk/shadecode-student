import { describe, expect, it } from "vitest";
import type { LocalExamAttempt } from "./exam-attempt";

function validAttempt(): LocalExamAttempt {
  return {
    attemptId: "exam:test-1",
    subject: "Mathematics",
    topic: "Trigonometry",
    level: 1,
    count: 5,
    questions: [{ id: 1, type: "multiple_choice", question: "1+1?", options: ["1", "2"], marks: 1, topic: "Numbers" }],
    answers: [],
    current: 0,
    seconds: 119,
    totalSeconds: 120,
    startedAt: Date.now(),
    flags: [],
    status: "active",
    updatedAt: new Date().toISOString(),
  };
}

describe("local exam attempt contract", () => {
  it("keeps attempts user-addressable and resumable", () => {
    const attempt = validAttempt();
    expect(attempt.attemptId).toBeTruthy();
    expect(attempt.questions.length).toBeGreaterThan(0);
    expect(attempt.status).toBe("active");
    expect(attempt.seconds).toBeLessThanOrEqual(attempt.totalSeconds);
  });

  it("stores answers independently from generated questions", () => {
    const attempt = validAttempt();
    attempt.answers = [{ questionId: 1, answer: "2", timeSpent: 7 }];
    expect(attempt.questions[0].question).toBe("1+1?");
    expect(attempt.answers[0].answer).toBe("2");
    expect(attempt.answers[0].timeSpent).toBe(7);
  });
});
