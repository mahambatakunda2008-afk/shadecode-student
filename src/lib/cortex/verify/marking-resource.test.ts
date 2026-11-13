import { describe, expect, it } from "vitest";
import {
  assessMarkingResourceUse,
  validateCuratedMarkingRubric,
  type MarkingResourceEvidence,
  type CuratedMarkingRubric,
} from "./marking-resource";

const source: MarkingResourceEvidence = {
  id: "source-9702-p2-2025",
  title: "Physics 9702 Paper 2 marking resource",
  kind: "official_mark_scheme",
  access: "user_upload",
  reuse: "personal_study",
  review: "verified",
  authority: "Cambridge International",
  sourceUrl: "https://example.org/source",
  sourceDocument: "9702_p2_ms.pdf",
  retrievedAt: "2026-11-13T12:00:00Z",
  contentSha256: "a".repeat(64),
  syllabusIdentity: {
    boardId: "cambridge",
    qualificationId: "as-a-level",
    level: "AS",
    subjectId: "physics",
    syllabusId: "9702",
    syllabusVersion: "2025-2027",
    examYear: 2025,
    paperComponentId: "P2",
  },
  reviewerId: "teacher-1",
  reviewedAt: "2026-11-13T13:00:00Z",
};

const rubric: CuratedMarkingRubric = {
  version: 1,
  totalMarks: 3,
  sourceEvidenceId: source.id,
  syllabusIdentity: source.syllabusIdentity,
  reviewerId: "teacher-1",
  reviewedAt: "2026-11-13T13:00:00Z",
  limitations: ["Phrase matching does not assess equivalent diagrams or alternative valid wording."],
  criteria: [
    { id: "m1", description: "Identifies the correct relationship", marks: 1, acceptedAnswers: ["directly proportional"] },
    { id: "m2", description: "States the relevant quantity", marks: 2, acceptedAnswers: ["potential difference"] },
  ],
};

describe("marking resource evidence and rights", () => {
  it("allows external reference links without copying source content", () => {
    const decision = assessMarkingResourceUse({ ...source, reuse: "link_only", review: "discovered" }, "reference");
    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe("reference_link");
  });

  it("blocks restricted or unknown reuse for offline content", () => {
    const decision = assessMarkingResourceUse({ ...source, reuse: "unknown" }, "private_offline");
    expect(decision.allowed).toBe(false);
  });

  it("requires open licence or explicit permission for redistribution", () => {
    expect(assessMarkingResourceUse(source, "redistribute").allowed).toBe(false);
    expect(assessMarkingResourceUse({ ...source, reuse: "open_license" }, "redistribute").allowed).toBe(true);
  });

  it("accepts a reviewed, version-bound, rights-cleared rubric", () => {
    expect(validateCuratedMarkingRubric(rubric, source)).toMatchObject({ valid: true, reasons: [] });
  });

  it("rejects rubric totals, provenance, reviewer and rights mismatches", () => {
    const result = validateCuratedMarkingRubric({
      ...rubric,
      totalMarks: 4,
      sourceEvidenceId: "different-source",
      reviewerId: "",
      limitations: [],
    }, { ...source, reuse: "unknown" });
    expect(result.valid).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects an unverified resource even when a reviewer is named", () => {
    const result = validateCuratedMarkingRubric(rubric, { ...source, review: "reviewed" });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("A source must reach verified status before its rubric can be used by the offline marker.");
  });
});
