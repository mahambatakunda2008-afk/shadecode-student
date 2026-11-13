import { describe, expect, it } from "vitest";
import { canonicalEventId, normalizeLearningEvent } from "./learningEvents";

describe("syllabus-aware canonical learning events", () => {
  const base = {
    userId: "learner-1",
    source: "exam-sim",
    sourceEventId: "attempt-1-question-4",
    type: "question.attempted",
    subjectId: "9702",
    topicId: "waves",
  };

  it("carries the verified syllabus into the canonical event", () => {
    const result = normalizeLearningEvent({ ...base, syllabusId: "9702-2025-2027" });
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;
    expect(result.event.syllabusId).toBe("9702-2025-2027");
  });

  it("creates distinct idempotency identities for different syllabuses", () => {
    expect(canonicalEventId("learner-1", "exam-sim", "same-source-id", "9702-2025-2027"))
      .not.toBe(canonicalEventId("learner-1", "exam-sim", "same-source-id", "9709-2025-2027"));
  });

  it("keeps legacy unscoped events in a separate identity lane", () => {
    expect(canonicalEventId("learner-1", "exam-sim", "same-source-id"))
      .not.toBe(canonicalEventId("learner-1", "exam-sim", "same-source-id", "9702-2025-2027"));
  });
});
