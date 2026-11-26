import { describe, expect, it } from "vitest";
import { buildDeepLessonPrompt, buildLessonRepairPrompt, lessonQualityScore } from "./contentQuality";

describe("Learn content quality", () => {
  it("treats broad subjects as masterclass requests", () => {
    const prompt = buildDeepLessonPrompt("Chemistry", "Organic Chemistry", "medium");
    expect(prompt).toContain("BROAD MASTERCLASS request");
    expect(prompt).toContain("major branches");
    expect(prompt).toContain("16-20 blocks");
  });

  it("requires independently checked answers and complete practice guidance", () => {
    const prompt = buildDeepLessonPrompt("Mathematics", "Integration", "easy");
    expect(prompt).toContain("Independently recompute every numerical result");
    expect(prompt).toContain("matching, useful answer guidance");
    expect(prompt).toContain("Never leave a sentence, equation, worked solution or answer unfinished");
  });

  it("adds integration-specific mathematical safeguards during repair", () => {
    const prompt = buildLessonRepairPrompt("Mathematics", "Integration", "weak draft");
    expect(prompt).toContain("the power rule excludes n = -1");
    expect(prompt).toContain("signed integral from total geometric area");
    expect(prompt).toContain("displacement from distance");
  });

  it("does not inject integration-specific corrections into unrelated subjects", () => {
    const prompt = buildLessonRepairPrompt("Physics", "Waves", "weak draft");
    expect(prompt).not.toContain("the power rule excludes n = -1");
  });

  it("rewards substantive teaching structure", () => {
    const blocks = [
      { type: "concept", content: "x".repeat(180) },
      { type: "mechanism", content: "x".repeat(180) },
      { type: "example", content: "x".repeat(180) },
      { type: "application", content: "x".repeat(180) },
      { type: "checkpoint", content: "x".repeat(180) },
      { type: "synthesis", content: "x".repeat(180) },
    ];
    expect(lessonQualityScore(blocks)).toBeGreaterThan(50);
  });
});
