import { describe, expect, it } from "vitest";
import light from "../../../docs/learning-assets/drafts/biology-9700-photosynthesis-light-dependent.v1.json";
import practical from "../../../docs/learning-assets/drafts/biology-9700-photosynthesis-limiting-factors.v1.json";

const packages = [light, practical];
const expected = [
  ...Array.from({ length: 12 }, (_, i) => `13.1.${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `13.2.${i + 1}`),
];

describe("Cambridge Biology 9700 Topic 13 draft assets", () => {
  it("covers all 16 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(16);
    expect(new Set(codes).size).toBe(16);
    expect([...codes].sort()).toEqual([...expected].sort());
  });
  it("keeps packages draft-only and unmapped", () => {
    for (const item of packages) {
      expect(item.curriculum.status).toBe("draft");
      expect(item.review_status).toBe("draft");
      expect(item.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    }
  });
  it("requires answered questions and mark points", () => {
    for (const item of packages) {
      expect(item.content.sections.length).toBeGreaterThanOrEqual(5);
      expect(item.content.questions.length).toBeGreaterThanOrEqual(4);
      for (const question of item.content.questions) {
        expect(question.answer.length).toBeGreaterThan(5);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
    }
  });
  it("links ten Topic 13 visual assets", () => {
    const assets = packages.flatMap((item) => item.content.visual_assets);
    expect(assets).toHaveLength(10);
    expect(assets.every((asset) => asset.path.startsWith("/learning-assets/biology/9700/photosynthesis/"))).toBe(true);
  });
});
