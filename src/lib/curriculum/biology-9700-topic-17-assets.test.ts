import { describe, expect, it } from "vitest";
import variation from "../../../docs/learning-assets/drafts/biology-9700-selection-variation.v1.json";
import natural from "../../../docs/learning-assets/drafts/biology-9700-selection-natural.v1.json";
import artificial from "../../../docs/learning-assets/drafts/biology-9700-selection-artificial.v1.json";

const packages = [variation, natural, artificial];
const expected = [
  ...Array.from({ length: 4 }, (_, i) => `17.1.${i + 1}`),
  ...Array.from({ length: 7 }, (_, i) => `17.2.${i + 1}`),
];

describe("Cambridge Biology 9700 Topic 17 draft assets", () => {
  it("covers all 11 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(11);
    expect(new Set(codes).size).toBe(11);
    expect([...codes].sort()).toEqual([...expected].sort());
  });

  it("keeps all packages draft-only and unmapped", () => {
    for (const item of packages) {
      expect(item.curriculum.status).toBe("draft");
      expect(item.review_status).toBe("draft");
      expect(item.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    }
  });

  it("requires answered questions and mark points", () => {
    for (const item of packages) {
      expect(item.content.sections.length).toBeGreaterThanOrEqual(7);
      expect(item.content.questions.length).toBeGreaterThanOrEqual(8);
      for (const question of item.content.questions) {
        expect(question.answer.length).toBeGreaterThan(5);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
    }
  });

  it("links all ten Topic 17 SVG assets", () => {
    const assets = packages.flatMap((item) => item.content.visual_assets);
    expect(assets).toHaveLength(10);
    expect(assets.every((asset) => asset.path.startsWith("/learning-assets/biology/9700/selection-and-evolution/"))).toBe(true);
  });
});
