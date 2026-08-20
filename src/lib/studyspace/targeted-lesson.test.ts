import { describe, expect, it, vi } from "vitest";
import { generateTargetedLesson, targetedLessonRequest } from "./targeted-lesson";
import type { ProfileRecommendation } from "./profile-adaptive";

vi.mock("@/lib/cortex/lessonGenerator", () => ({
  generateLesson: vi.fn(async (subject: string, topic: string, userId: string) => ({
    title: `Introduction to ${topic}`,
    subject,
    difficulty: "medium",
    summary: "Targeted lesson",
    sections: [],
    practiceQuestions: [],
    estimatedMinutes: 15,
    userId,
  })),
}));

const recommendation: ProfileRecommendation = {
  action: "lesson",
  subject: "Physics",
  topic: "Oscillations",
  reason: "Your recent performance is declining.",
  priority: "high",
};

describe("targeted lesson generation", () => {
  it("turns a lesson recommendation into a generation request", () => {
    expect(targetedLessonRequest(recommendation, "user-1")).toEqual({
      subject: "Physics",
      topic: "Oscillations",
      userId: "user-1",
      reason: recommendation.reason,
    });
  });

  it("does not generate a lesson for non-lesson actions", () => {
    expect(targetedLessonRequest({ ...recommendation, action: "practice" }, "user-1")).toBeNull();
  });

  it("delegates generation to the existing Cortex lesson generator", async () => {
    const lesson = await generateTargetedLesson(recommendation, "user-1");
    expect(lesson?.subject).toBe("Physics");
    expect(lesson?.title).toContain("Oscillations");
  });
});
