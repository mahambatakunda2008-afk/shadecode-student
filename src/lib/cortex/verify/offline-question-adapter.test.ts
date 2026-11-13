import { describe, expect, it } from "vitest";
import { buildOfflineVerifyRubric } from "./offline-question-adapter";
import type { ExamQuestion } from "@/lib/exam/types";

const syllabusIdentity = {
  boardId: "cambridge", qualificationId: "as-a-level", level: "AS",
  subjectId: "physics", syllabusId: "9702", syllabusVersion: "2025-2027",
  examYear: 2025, paperComponentId: "P2",
};
const markingSource = {
  id: "physics-9702-ms",
  title: "Official marking scheme",
  kind: "official_mark_scheme" as const,
  access: "user_upload" as const,
  reuse: "personal_study" as const,
  review: "verified" as const,
  authority: "Cambridge International",
  sourceUrl: "https://example.org/mark-scheme",
  retrievedAt: "2026-11-13T10:00:00Z",
  contentSha256: "a".repeat(64),
  syllabusIdentity,
  reviewerId: "teacher-1",
  reviewedAt: "2026-11-13T11:00:00Z",
};
const base: ExamQuestion = {
  id: 1,
  type: "short_answer",
  question: "Calculate the answer.",
  marks: 3,
  topic: "Numerical skills",
  syllabusIdentity,
};

describe("buildOfflineVerifyRubric", () => {
  it("maps a question with a validated numeric spec", () => {
    const rubric = buildOfflineVerifyRubric({
      ...base,
      numeric: { exact: 0.25, tolerance: 0.001, unit: "m" },
    });
    expect(rubric).toEqual({
      version: 1,
      kind: "exact-number",
      answer: 0.25,
      tolerance: 0.001,
      marks: 3,
      criterion: "Numerical answer",
      explanation: "Compare the numerical result and required unit (m) with the supplied answer key.",
    });
  });

  it("maps a multiple-choice question only when its answer key exists", () => {
    expect(buildOfflineVerifyRubric({
      ...base,
      type: "multiple_choice",
      options: ["A", "B", "C", "D"],
      modelAnswer: "B",
    })).toMatchObject({ kind: "multiple-choice", answer: "B", marks: 3 });
    expect(buildOfflineVerifyRubric({ ...base, type: "multiple_choice" })).toBeNull();
  });

  it("maps only a verified, rights-cleared, version-matched structured rubric", () => {
    const rubric = buildOfflineVerifyRubric({
      ...base,
      type: "structured",
      offlineMarking: {
        version: 1,
        source: markingSource,
        reviewerId: "teacher-1",
        reviewedAt: "2026-11-13T11:00:00Z",
        limitations: ["Phrase matching may miss equivalent valid wording."],
        criteria: [
          { id: "p1", description: "First marking point", marks: 2, acceptedAnswers: ["first approved phrase"] },
          { id: "p2", description: "Second marking point", marks: 1, acceptedAnswers: ["second approved phrase"] },
        ],
      },
    });
    expect(rubric).toMatchObject({ kind: "structured-points", marks: 3, criteria: [{ id: "p1" }, { id: "p2" }] });
  });

  it("rejects structured rubrics without rights or source evidence", () => {
    const rubric = buildOfflineVerifyRubric({
      ...base,
      type: "structured",
      offlineMarking: {
        version: 1,
        source: { ...markingSource, reuse: "unknown" },
        reviewerId: "teacher-1",
        reviewedAt: "2026-11-13T11:00:00Z",
        limitations: ["Phrase matching may miss equivalent valid wording."],
        criteria: [{ id: "p1", description: "First point", marks: 3, acceptedAnswers: ["first approved phrase"] }],
      },
    });
    expect(rubric).toBeNull();
  });

  it("does not infer keys for short-answer, structured or essay questions", () => {
    expect(buildOfflineVerifyRubric({ ...base, modelAnswer: "Some text" })).toBeNull();
    expect(buildOfflineVerifyRubric({ ...base, type: "structured", modelAnswer: "A long model answer" })).toBeNull();
    expect(buildOfflineVerifyRubric({ ...base, type: "essay", modelAnswer: "An essay" })).toBeNull();
  });

  it("rejects malformed numeric metadata", () => {
    expect(buildOfflineVerifyRubric({ ...base, numeric: { exact: Number.NaN, tolerance: 0.01 } })).toBeNull();
    expect(buildOfflineVerifyRubric({ ...base, numeric: { exact: 2, tolerance: -1 } })).toBeNull();
  });
});
