import { describe, expect, it } from "vitest";
import { resolveCurriculumIngestionRunStatus, summarizeCurriculumWatchStatus } from "./source-watch-status";

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
