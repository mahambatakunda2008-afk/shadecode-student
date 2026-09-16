import { describe, expect, it } from "vitest";
import { buildDeepLessonPrompt, lessonQualityScore } from "./contentQuality";

describe("Learn content quality", () => {
  it("treats broad subjects as masterclass requests", () => {
    const prompt = buildDeepLessonPrompt("Chemistry", "Organic Chemistry", "medium");
    expect(prompt).toContain("BROAD MASTERCLASS request");
    expect(prompt).toContain("major branches");
    expect(prompt).toContain("16-24 blocks");
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
