import { describe, expect, it } from "vitest";
import standard from "../../../docs/curriculum/VISUAL_AND_MULTIMODAL_CONTENT_STANDARD.json";
import scarcity from "../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";
import methodology from "../../../docs/curriculum/lessons/economics-9708-as-1.2-economic-methodology.json";
import factors from "../../../docs/curriculum/lessons/economics-9708-as-1.3-factors-of-production.json";

describe("curriculum visual and multimodal standard", () => {
  it("covers science, humanities, economics, technical and creative arts", () => {
    for (const discipline of ["mathematics", "sciences", "geography", "economics", "history", "languages_literature", "arts_visual", "music", "drama_dance", "physical_technical_vocational"]) {
      expect(standard.modes[discipline as keyof typeof standard.modes]?.length).toBeGreaterThan(0);
    }
    expect(standard.requirements.some((item) => item.toLowerCase().includes("every subject"))).toBe(true);
  });

  it("requires outcome-linked, accessible and offline-included visual assets", () => {
    for (const field of standard.qualityGate.requiredFields) expect(field).toBeTruthy();
    expect(standard.accessibility.length).toBeGreaterThanOrEqual(4);
    expect(standard.offline.some((item) => item.includes("No essential diagram"))).toBe(true);
    expect(standard.qualityGate.rejectIf.some((item) => item.includes("art/music/performance"))).toBe(true);
  });

  it.each([scarcity, methodology, factors])("keeps every required lesson visual outcome-linked and available offline", (lesson) => {
    expect(lesson.visuals.length).toBeGreaterThan(0);
    for (const visual of lesson.visuals) {
      expect(visual.learningObjectiveIds.length).toBeGreaterThan(0);
      expect(visual.offlineIncluded).toBe(true);
      expect(lesson.offline.assets.some((asset) => asset.assetId === visual.assetId)).toBe(true);
    }
  });
});
