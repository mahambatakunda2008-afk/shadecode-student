import { describe, expect, it } from "vitest";
import { sanitizeVerifyInterventionMetadata } from "./verifyInterventionMetadata";

describe("sanitizeVerifyInterventionMetadata", () => {
  it("preserves a well-formed intervention link on a question attempt", () => {
    const metadata = {
      interventionId: "vi_m2abc_xyz123",
      interventionLevel: "method",
      interventionToAttemptHours: 1.5,
      freshTransfer: true,
      correct: true,
      evidenceScore: 82,
    };
    expect(sanitizeVerifyInterventionMetadata(metadata, "question.attempted")).toEqual(metadata);
  });

  it("removes malformed or incomplete intervention links without dropping score evidence", () => {
    const result = sanitizeVerifyInterventionMetadata({
      interventionId: "not-a-valid-id",
      interventionLevel: "admin",
      interventionToAttemptHours: 900,
      freshTransfer: "yes",
      correct: false,
      evidenceScore: 20,
    }, "question.attempted");
    expect(result).toEqual({ correct: false, evidenceScore: 20 });
  });

  it("removes intervention links from non-question events", () => {
    const result = sanitizeVerifyInterventionMetadata({
      interventionId: "vi_m2abc_xyz123",
      interventionLevel: "hint",
      interventionToAttemptHours: 0,
      freshTransfer: false,
      aggregateOnly: true,
    }, "exam.completed");
    expect(result).toEqual({ aggregateOnly: true });
  });

  it("leaves unrelated metadata untouched when no intervention link exists", () => {
    const metadata = { correct: true, responseSeconds: 42 };
    expect(sanitizeVerifyInterventionMetadata(metadata, "question.attempted")).toEqual(metadata);
  });

  it("does not invent metadata when none was supplied", () => {
    expect(sanitizeVerifyInterventionMetadata(undefined, "question.attempted")).toBeUndefined();
  });
});
