import { describe, expect, it } from "vitest";
import { buildDeepLessonPrompt, buildDeepSectionGuidance, lessonQualityScore } from "./contentQuality";

describe("Learn content quality", () => {
  it("treats broad subjects as masterclass requests", () => {
    const prompt = buildDeepLessonPrompt("Chemistry", "Organic Chemistry", "medium");
    expect(prompt).toContain("BROAD MASTERCLASS request");
    expect(prompt).toContain("major branches");
    expect(prompt).toContain("16-20 blocks");
  });

  it("honors a resolved broad-topic flag even when the topic label is not in the planner list", () => {
    const prompt = buildDeepLessonPrompt("Physics", "Waves", "medium", "", true);
    expect(prompt).toContain("BROAD MASTERCLASS request");
    expect(prompt).toContain("16-20 blocks");
  });


  it("uses section-sized guidance without imposing whole-lesson block counts", () => {
    const prompt = buildDeepSectionGuidance("Physics", "Waves", "medium", "Verified wave objectives", true);
    expect(prompt).toContain("broad topic");
    expect(prompt).toContain("Verified wave objectives");
    expect(prompt).toContain("generate only the assigned section");
    expect(prompt).not.toContain("14-16 blocks");
    expect(prompt).not.toContain("Never return fewer than 14");
  });

  it("keeps focused section guidance scoped to the requested topic", () => {
    const prompt = buildDeepSectionGuidance("Mathematics", "Integration by substitution", "hard");
    expect(prompt).toContain("focused topic");
    expect(prompt).toContain("power rule excludes exponent -1");
    expect(prompt).toContain("single-dollar LaTeX");
    expect(prompt).not.toContain("16-20 blocks");
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
