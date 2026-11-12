import { describe, expect, it } from "vitest";
import { deriveReviewSessionActivity } from "./review-session-activity";

describe("deriveReviewSessionActivity", () => {
  const row = (type: string, entityId: string, extra: Record<string, unknown> = {}) => ({
    type,
    created_at: "2026-11-12T10:00:00.000Z",
    data: {
      subjectId: "physics",
      topicId: "waves",
      entityId,
      metadata: { reviewSessionId: "session-1", reviewSource: "cortex_suggestion", ...extra },
    },
  });

  it("does not count a suggestion click without an answered question", () => {
    expect(deriveReviewSessionActivity([])).toEqual([]);
  });

  it("records practice only after question-level evidence exists", () => {
    expect(deriveReviewSessionActivity([
      row("question_attempted", "q1"),
      row("question_attempted", "q2"),
    ])).toEqual([expect.objectContaining({
      reviewSessionId: "session-1",
      subjectKey: "physics",
      topicId: "waves",
      answeredQuestionCount: 2,
      state: "practised",
    })]);
  });

  it("marks a session completed only when its quiz completion event exists", () => {
    expect(deriveReviewSessionActivity([
      row("question_attempted", "q1"),
      row("quiz_completed", "lesson-1"),
    ])).toEqual([expect.objectContaining({
      answeredQuestionCount: 1,
      state: "completed",
    })]);
  });

  it("marks an exam review completed after its question attempts", () => {
    expect(deriveReviewSessionActivity([
      row("question_attempted", "q1"),
      row("question_attempted", "q2"),
      row("exam_completed", "exam-1"),
    ])).toEqual([expect.objectContaining({ answeredQuestionCount: 2, state: "completed" })]);
  });

  it("ignores events without the Cortex suggestion attribution", () => {
    expect(deriveReviewSessionActivity([
      row("question_attempted", "q1", { reviewSource: "normal_learn" }),
      row("quiz_completed", "lesson-1", { reviewSessionId: null }),
    ])).toEqual([]);
  });

  it("does not mix subjects or topics inside one session", () => {
    const mismatched = {
      ...row("quiz_completed", "lesson-1"),
      data: { ...row("quiz_completed", "lesson-1").data, subjectId: "chemistry" },
    };
    expect(deriveReviewSessionActivity([row("question_attempted", "q1"), mismatched])[0].state).toBe("practised");
  });
});
