import { describe, expect, it } from "vitest";
import mammals from "../../../docs/learning-assets/drafts/biology-9700-homeostasis-mammals.v1.json";
import plants from "../../../docs/learning-assets/drafts/biology-9700-homeostasis-plants.v1.json";

const packages = [mammals, plants];
const expected = [
  ...Array.from({ length: 11 }, (_, i) => `14.1.${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `14.2.${i + 1}`),
];

describe("Cambridge Biology 9700 Topic 14 draft assets", () => {
  it("covers all 15 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(15);
    expect(new Set(codes).size).toBe(15);
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
  it("links all eleven Topic 14 SVG assets", () => {
    const assets = packages.flatMap((item) => item.content.visual_assets);
    expect(assets).toHaveLength(11);
    expect(assets.every((asset) => asset.path.startsWith("/learning-assets/biology/9700/homeostasis/"))).toBe(true);
  });
});
