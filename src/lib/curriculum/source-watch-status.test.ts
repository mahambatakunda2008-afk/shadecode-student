import { describe, expect, it } from "vitest";
import { hasCurriculumVersionConflict, resolveCurriculumExtractionSkipReason, resolveCurriculumIngestionRunStatus, summarizeCurriculumWatchStatus } from "./source-watch-status";

describe("curriculum watcher source status", () => {
  it("does not call a source successful when it discovers no documents", () => {
    expect(summarizeCurriculumWatchStatus([])).toBe("no_documents");
  });

  it("reports failure when every discovered document fails or has empty extraction", () => {
    expect(summarizeCurriculumWatchStatus(["extraction-failed", "extraction-empty"])).toBe("failed");
  });

  it("reports partial when at least one document succeeds and another fails", () => {
    expect(summarizeCurriculumWatchStatus(["extracted", "extraction-failed"])).toBe("partial");
  });

  it("reports success when all documents have a valid outcome", () => {
    expect(summarizeCurriculumWatchStatus(["extracted", "extracted"])).toBe("ok");
    expect(summarizeCurriculumWatchStatus(["discovered"])).toBe("ok");
  });
});

describe("curriculum ingestion run outcome", () => {
  it("marks only fully successful ingestion as completed", () => {
    expect(resolveCurriculumIngestionRunStatus("ok", 0)).toBe("completed");
  });

  it("marks skipped extraction and partial source results as partial", () => {
    expect(resolveCurriculumIngestionRunStatus("ok", 1)).toBe("partial");
    expect(resolveCurriculumIngestionRunStatus("partial", 0)).toBe("partial");
  });

  it("marks failed or empty discovery as failed", () => {
    expect(resolveCurriculumIngestionRunStatus("failed", 0)).toBe("failed");
    expect(resolveCurriculumIngestionRunStatus("no_documents", 0)).toBe("failed");
    expect(resolveCurriculumIngestionRunStatus(undefined, 0)).toBe("failed");
  });
});

describe("curriculum syllabus version conflict guard", () => {
  it("blocks ingestion when discovered and configured versions disagree", () => {
    expect(hasCurriculumVersionConflict("2028-2030", "2025-2027")).toBe(true);
  });

  it("allows matching versions and sources without a discovered version", () => {
    expect(hasCurriculumVersionConflict("2028-2030", "2028-2030")).toBe(false);
    expect(hasCurriculumVersionConflict("2028-2030", null)).toBe(false);
    expect(hasCurriculumVersionConflict(null, "2025-2027")).toBe(false);
  });
});

describe("watched syllabus version resolution", () => {
  it("preserves a version discovered in the PDF even when it conflicts with the registry", async () => {
    const { resolveWatchedSyllabusVersion } = await import("./source-watch-status");
    expect(resolveWatchedSyllabusVersion({
      configuredVersion: "2028-2030",
      discoveredVersion: "2025-2027",
      discoveryConfidence: "high",
      discoveryEvidence: ["The PDF cover states 2025-2027."],
    })).toEqual({
      version: "2025-2027",
      source: "document",
      confidence: "high",
      evidence: ["The PDF cover states 2025-2027."],
    });
  });

  it("uses the registry version only when the PDF does not identify one", async () => {
    const { resolveWatchedSyllabusVersion } = await import("./source-watch-status");
    expect(resolveWatchedSyllabusVersion({ configuredVersion: "2028-2030" })).toEqual({
      version: "2028-2030",
      source: "registry",
      confidence: "registry-configured",
      evidence: ["Source registry explicitly configured this syllabus version; the PDF itself did not expose a version string."],
    });
  });

  it("does not invent a version when neither source identifies one", async () => {
    const { resolveWatchedSyllabusVersion } = await import("./source-watch-status");
    expect(resolveWatchedSyllabusVersion({})).toEqual({
      version: null,
      source: "unresolved",
      confidence: "unresolved",
      evidence: [],
    });
  });
});


describe("curriculum extraction decision gate", () => {
  it("prioritises version conflicts even when PDF text extraction returned nothing", async () => {
    const { resolveCurriculumExtractionSkipReason } = await import("./source-watch-status");
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: true,
      extractedText: null,
    })).toBe("version_conflict");
  });

  it("blocks missing curriculum identity before extraction", async () => {
    const { resolveCurriculumExtractionSkipReason } = await import("./source-watch-status");
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: false,
      versionConflict: false,
      extractedText: "syllabus text",
    })).toBe("missing_curriculum");
  });

  it("skips empty text only after the version invariant passes", async () => {
    const { resolveCurriculumExtractionSkipReason } = await import("./source-watch-status");
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: false,
      versionSource: "document",
      extractedText: "  ",
    })).toBe("missing_extracted_text");
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: false,
      versionSource: "document",
      extractedText: "valid syllabus text",
    })).toBeNull();
  });
});


describe("curriculum extraction requires document-backed version evidence", () => {
  it("blocks registry-configured versions even when text is available", () => {
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: false,
      versionSource: "registry",
      extractedText: "valid syllabus text",
    })).toBe("unconfirmed_version");
  });

  it("blocks unresolved versions", () => {
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: false,
      versionSource: "unresolved",
      extractedText: "valid syllabus text",
    })).toBe("unconfirmed_version");
  });

  it("allows extraction only when the document itself identifies the version", () => {
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: false,
      versionSource: "document",
      extractedText: "valid syllabus text",
    })).toBeNull();
  });

  it("keeps a detected version conflict higher priority than missing evidence", () => {
    expect(resolveCurriculumExtractionSkipReason({
      curriculumResolved: true,
      versionConflict: true,
      versionSource: "registry",
      extractedText: null,
    })).toBe("version_conflict");
  });
});
