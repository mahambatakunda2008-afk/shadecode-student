import { describe, expect, it } from "vitest";
import {
  crossProductEvidenceEventKey,
  crossProductEvidenceStorageKey,
  toPrivateCrossProductSignal,
} from "./crossProductEvidence";

const base = {
  source: "exam-sim",
  sourceEventId: "attempt-1-question-4",
  type: "question.attempted",
  occurredAt: "2026-11-14T17:00:00.000Z",
  subjectId: "Physics",
  topicId: "Waves",
};

describe("toPrivateCrossProductSignal", () => {
  it("converts explicit scored question evidence", () => {
    expect(toPrivateCrossProductSignal({
      ...base,
      metadata: { correct: true, evidenceScore: 42, misconceptionTags: "phase;frequency" },
    })).toEqual({
      subject: "Physics",
      topic: "Waves",
      score: 42,
      correct: true,
      misconceptionTags: ["phase", "frequency"],
      occurredAt: base.occurredAt,
    });
  });

  it("uses an explicit correctness value when no numeric score exists", () => {
    expect(toPrivateCrossProductSignal({ ...base, metadata: { correct: false } }))
      .toMatchObject({ score: 0, correct: false });
  });

  it("derives auxiliary correctness from partial score without discarding the score", () => {
    expect(toPrivateCrossProductSignal({ ...base, metadata: { evidenceScore: 68 } }))
      .toMatchObject({ score: 68, correct: true });
    expect(toPrivateCrossProductSignal({ ...base, metadata: { percentage: 31 } }))
      .toMatchObject({ score: 31, correct: false });
  });

  it("accepts supported dotted completion event names when they carry a score", () => {
    for (const type of ["lesson.completed", "activity.completed", "quiz.completed", "exam.completed", "project.stage_completed"]) {
      expect(toPrivateCrossProductSignal({ ...base, type, metadata: { correct: true } })).not.toBeNull();
    }
  });

  it("rejects events without explicit scoring evidence", () => {
    expect(toPrivateCrossProductSignal({ ...base, metadata: {} })).toBeNull();
    expect(toPrivateCrossProductSignal(base)).toBeNull();
  });

  it("rejects self-assessed and aggregate-only evidence", () => {
    expect(toPrivateCrossProductSignal({ ...base, metadata: { correct: true, selfAssessment: true } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, metadata: { correct: true, aggregateOnly: true } })).toBeNull();
  });

  it("rejects unsupported event types and incomplete curriculum context", () => {
    expect(toPrivateCrossProductSignal({ ...base, type: "lesson.viewed", metadata: { correct: true } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, topicId: undefined, metadata: { correct: true } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, subjectId: undefined, metadata: { correct: true } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, sourceEventId: "", metadata: { correct: true } })).toBeNull();
  });

  it("rejects non-finite and out-of-range numeric scores", () => {
    expect(toPrivateCrossProductSignal({ ...base, metadata: { evidenceScore: Number.NaN } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, metadata: { evidenceScore: 101 } })).toBeNull();
    expect(toPrivateCrossProductSignal({ ...base, metadata: { percentage: -1 } })).toBeNull();
  });

  it("bounds misconception tags and removes empty entries", () => {
    const tags = Array.from({ length: 12 }, (_, index) => `error-${index}`).join(";;");
    expect(toPrivateCrossProductSignal({ ...base, metadata: { correct: false, misconceptionTags: tags } })?.misconceptionTags)
      .toHaveLength(8);
  });
});

describe("cross-product evidence identity", () => {
  it("deduplicates by source and source event ID", () => {
    expect(crossProductEvidenceEventKey(base)).toBe("exam-sim:attempt-1-question-4");
    expect(crossProductEvidenceEventKey({ ...base, source: "learn" })).not.toBe(crossProductEvidenceEventKey(base));
  });

  it("keeps local evidence dedupe storage account-scoped", () => {
    expect(crossProductEvidenceStorageKey("learner-a")).not.toBe(crossProductEvidenceStorageKey("learner-b"));
    expect(crossProductEvidenceStorageKey("learner/a")).toContain(encodeURIComponent("learner/a"));
  });
});
