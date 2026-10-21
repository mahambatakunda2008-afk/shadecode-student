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

  it("does not treat a placeholder source hash as evidence", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      document: { ...completeInput.document, contentHash: "not-computed:web-fetch" },
    });
    expect(result.blockers).toContain("Source-byte fingerprint is missing, malformed, or explicitly uncomputed.");
  });

  it("does not infer verification from a version status alone", () => {
    const result = evaluateCurriculumReadiness({
      ...completeInput,
      provenance: {},
    });
    expect(result.blockers).toContain("Whole-syllabus review evidence, method, and date are not all recorded.");
  });
});
