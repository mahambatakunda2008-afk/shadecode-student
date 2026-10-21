import { describe, expect, it } from "vitest";
import { evaluateCurriculumReadiness } from "./readiness-gate";

const completeInput = {
  versionStatus: "verified",
  sourceDocumentId: "doc-1",
  document: {
    url: "https://official.example/syllabus.pdf",
    contentHash: "a".repeat(64),
    contentCharacters: 10,
    extractedText: "0123456789",
    extractionStatus: "extracted",
    status: "verified",
  },
  coverageChecks: Array.from({ length: 29 }, (_, index) => ({
    dimension: `dimension_${index + 1}`,
    status: index === 28 ? "not_applicable" : "verified",
    notes: index === 28 ? "This syllabus has no coursework component." : null,
  })),
  expectedCoverageDimensions: 29,
  objectiveCount: 10,
  verifiedObjectiveCount: 10,
  provenance: {
    wholeSyllabusVerified: true,
    wholeSyllabusVerifiedAt: "2026-10-01T00:00:00Z",
    verificationMethod: "Independent review against official syllabus PDF",
    verificationEvidence: "All sections and assessment structure checked.",
  },
};

describe("evaluateCurriculumReadiness", () => {
  it("allows a fully evidenced version without mutating its stored status", () => {
    expect(evaluateCurriculumReadiness(completeInput).ready).toBe(true);
  });

  it("blocks a draft source document even when text and version metadata look complete", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      document: { ...completeInput.document, status: "draft" },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('Source document status is "draft"; the source document itself is not verified.');
  });

  it("blocks source text that is not recorded as successfully extracted", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      document: { ...completeInput.document, extractionStatus: "failed" },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('Source extraction status is "failed"; extracted text is not recorded as successfully extracted.');
  });

  it("blocks invalid objective and coverage counts", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      expectedCoverageDimensions: 0,
      objectiveCount: 2,
      verifiedObjectiveCount: 3,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Expected coverage dimension count must be a positive integer.");
    expect(result.blockers).toContain("Verified objective count is invalid or exceeds the recorded objective count.");
  });

  it("blocks an empty extracted document even when version status says verified", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      document: { ...completeInput.document, extractedText: "", contentCharacters: 0 },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("No extracted source text is available; manual notes alone do not satisfy this automated evidence gate.");
  });

  it("blocks missing coverage inventory and incomplete objective review", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      coverageChecks: completeInput.coverageChecks.slice(0, 2),
      verifiedObjectiveCount: 8,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((reason) => reason.includes("Coverage inventory is incomplete"))).toBe(true);
    expect(result.blockers).toContain("Only 8/10 objectives are marked verified.");
  });

  it("does not treat a placeholder or non-SHA-256-sized source hash as evidence", () => {
    for (const contentHash of ["not-computed:web-fetch", "a".repeat(32)]) {
      const result = evaluateCurriculumReadiness({
        ...completeInput,
        document: { ...completeInput.document, contentHash },
      });
      expect(result.blockers).toContain("Source-byte fingerprint is missing, malformed, or explicitly uncomputed.");
    }
  });

  it("blocks not-applicable dimensions without a rationale", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      coverageChecks: completeInput.coverageChecks.map((row, index) =>
        index === 28 ? { ...row, notes: null } : row
      ),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('Coverage dimension "dimension_29" is marked not_applicable without a visible rationale.');
  });

  it("does not accept an empty evidence object as a not-applicable rationale", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      coverageChecks: completeInput.coverageChecks.map((row, index) =>
        index === 28 ? { ...row, notes: null, evidence: {} } : row
      ),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('Coverage dimension "dimension_29" is marked not_applicable without a visible rationale.');
  });

  it("blocks duplicate coverage dimension IDs rather than letting the last row win", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      coverageChecks: [
        ...completeInput.coverageChecks,
        { dimension: "dimension_1", status: "missing", notes: null },
      ],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Coverage inventory contains duplicate dimension IDs: dimension_1.");
  });

  it("supports an explicitly configured board-specific coverage inventory", () => {
    const boardSpecificInput = {
      ...completeInput,
      coverageChecks: completeInput.coverageChecks.slice(0, 25),
      expectedCoverageDimensions: 25,
    };
    expect(evaluateCurriculumReadiness(boardSpecificInput).ready).toBe(true);
    expect(evaluateCurriculumReadiness(boardSpecificInput).metrics.coverageDimensionsRecorded).toBe(25);
  });

  it("still blocks a board-specific inventory when required dimensions are absent", () => {
    const boardSpecificInput = {
      ...completeInput,
      coverageChecks: completeInput.coverageChecks.slice(0, 24),
      expectedCoverageDimensions: 25,
    };
    const result = evaluateCurriculumReadiness(boardSpecificInput);
    expect(result.ready).toBe(false);
    expect(result.blockers.some((reason) => reason.includes("Coverage inventory is incomplete: 24/25"))).toBe(true);
  });

  it("does not infer verification from a version status alone", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      provenance: {},
    });
    expect(result.blockers).toContain("Whole-syllabus review evidence, method, and date are not all recorded.");
  });
});
