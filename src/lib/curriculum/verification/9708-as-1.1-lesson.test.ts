import { describe, expect, it } from "vitest";
import lesson from "../../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";

describe("Economics 9708 AS 1.1 lesson pack", () => {
  it("targets the four extracted syllabus outcomes and correct qualification", () => {
    expect(lesson.identity).toMatchObject({
      board: "cambridge", level: "as_level", subject: "economics",
      syllabusCode: "9708", syllabusVersion: "2026-2028", subtopic: "1.1",
    });
    expect(lesson.learningObjectives).toHaveLength(4);
    expect(lesson.identity.sourcePdf).toContain("697423");
  });

  it("teaches scarcity, opportunity cost and the three allocation questions", () => {
    const text = lesson.lesson.map((section) => JSON.stringify(section)).join(" ").toLowerCase();
    for (const concept of ["scarcity", "next best alternative forgone", "what to produce", "how to produce", "for whom to produce"]) {
      expect(text).toContain(concept);
    }
  });

  it("contains independent assessment with marking guidance and misconception checks", () => {
    expect(lesson.practice.length).toBeGreaterThanOrEqual(4);
    for (const item of lesson.practice) {
      expect(item.marks).toBeGreaterThan(0);
      expect(item.marking.length).toBeGreaterThan(0);
      expect(item.misconception.length).toBeGreaterThan(0);
    }
    expect(lesson.mastery.requireIndependentAttempt).toBe(true);
    expect(lesson.mastery.completionIsNotMastery).toBe(true);
  });

  it("is self-contained offline and honestly remains a draft pending review", () => {
    expect(lesson.offline).toMatchObject({ selfContained: true, networkRequired: false, aiRequired: false });
    expect(lesson.status).toBe("draft_content_requires_subject_review");
    expect(lesson.teacherReview.required).toBe(true);
  });
});
