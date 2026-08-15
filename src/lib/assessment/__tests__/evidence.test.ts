import { describe, expect, it } from "vitest";
import { buildAssessmentEvidence } from "../evidence";

describe("buildAssessmentEvidence", () => {
  const base = {
    id: "attempt-1",
    learnerId: "learner-1",
    source: "past_paper" as const,
    context: {
      assessmentType: "exam" as const,
      syllabusId: "9702",
      board: "Cambridge",
      paperId: "9702_w25_qp_52",
      year: 2025,
      session: "Oct/Nov",
    },
    attemptedAt: "2026-08-15T12:00:00.000Z",
  };

  it("aggregates question evidence into one assessment result", () => {
    const result = buildAssessmentEvidence({
      ...base,
      questions: [
        { questionId: "1", topic: "Mechanics", maxMarks: 10, awardedMarks: 8, percentage: 80 },
        { questionId: "2", topic: "Mechanics", maxMarks: 5, awardedMarks: 2, percentage: 40 },
      ],
    });

    expect(result.totalMarks).toBe(15);
    expect(result.awardedMarks).toBe(10);
    expect(result.percentage).toBe(67);
    expect(result.context.syllabusId).toBe("9702");
    expect(result.source).toBe("past_paper");
  });

  it("clamps impossible awarded marks instead of corrupting the result", () => {
    const result = buildAssessmentEvidence({
      ...base,
      questions: [
        { questionId: "1", maxMarks: 10, awardedMarks: 99, percentage: 990 },
        { questionId: "2", maxMarks: 5, awardedMarks: -3, percentage: -60 },
      ],
    });

    expect(result.totalMarks).toBe(15);
    expect(result.awardedMarks).toBe(10);
    expect(result.percentage).toBe(67);
  });

  it("preserves provenance and tertiary assessment context", () => {
    const result = buildAssessmentEvidence({
      ...base,
      source: "teacher_assessment",
      context: {
        assessmentType: "assignment",
        courseId: "CSC101",
        courseCode: "CSC101",
        courseName: "Programming Fundamentals",
        periodId: "semester-1",
      },
      questions: [
        { questionId: "task-1", maxMarks: 20, awardedMarks: 18, percentage: 90 },
      ],
      provenance: { documentId: "doc-1", verified: true },
    });

    expect(result.context.assessmentType).toBe("assignment");
    expect(result.context.courseId).toBe("CSC101");
    expect(result.provenance?.documentId).toBe("doc-1");
    expect(result.provenance?.verified).toBe(true);
  });

  it("returns zero percentage for an empty assessment", () => {
    const result = buildAssessmentEvidence({ ...base, questions: [] });
    expect(result.totalMarks).toBe(0);
    expect(result.awardedMarks).toBe(0);
    expect(result.percentage).toBe(0);
  });
});
