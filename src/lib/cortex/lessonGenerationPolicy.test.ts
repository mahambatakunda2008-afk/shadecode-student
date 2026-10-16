import { describe, expect, it } from "vitest";
import { shouldUseFastVerifiedCurriculumRecovery } from "./lessonGenerationPolicy";

describe("fast verified curriculum recovery policy", () => {
  it("does not bypass cloud generation for an authenticated online learner", () => {
    expect(shouldUseFastVerifiedCurriculumRecovery({ online: true, hasSessionToken: true })).toBe(false);
  });

  it("uses local verified material when offline", () => {
    expect(shouldUseFastVerifiedCurriculumRecovery({ online: false, hasSessionToken: true })).toBe(true);
  });

  it("uses local verified material when no session token is available", () => {
    expect(shouldUseFastVerifiedCurriculumRecovery({ online: true, hasSessionToken: false })).toBe(true);
  });
});
