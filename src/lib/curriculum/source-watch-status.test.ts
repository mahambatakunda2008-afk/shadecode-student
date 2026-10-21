import { describe, expect, it } from "vitest";
import { summarizeCurriculumWatchStatus } from "./source-watch-status";

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
