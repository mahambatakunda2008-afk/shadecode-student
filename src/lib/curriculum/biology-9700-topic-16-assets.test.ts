import { describe, expect, it } from "vitest";
import meiosis from "../../../docs/learning-assets/drafts/biology-9700-inheritance-meiosis.v1.json";
import crosses from "../../../docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json";
import phenotype from "../../../docs/learning-assets/drafts/biology-9700-inheritance-chi-squared-phenotype.v1.json";
import control from "../../../docs/learning-assets/drafts/biology-9700-inheritance-gene-control.v1.json";

const packages = [meiosis, crosses, phenotype, control];
const expected = [
  ...Array.from({ length: 7 }, (_, i) => `16.1.${i + 1}`),
  ...Array.from({ length: 7 }, (_, i) => `16.2.${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `16.3.${i + 1}`),
];

describe("Cambridge Biology 9700 Topic 16 draft assets", () => {
  it("covers all 18 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(18);
    expect(new Set(codes).size).toBe(18);
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
      expect(item.content.sections.length).toBeGreaterThanOrEqual(8);
      expect(item.content.questions.length).toBeGreaterThanOrEqual(10);
      for (const question of item.content.questions) {
        expect(question.answer.length).toBeGreaterThan(5);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
    }
  });

  it("links all fifteen Topic 16 SVG assets", () => {
    const assets = packages.flatMap((item) => item.content.visual_assets);
    expect(assets).toHaveLength(15);
    expect(assets.every((asset) => asset.path.startsWith("/learning-assets/biology/9700/inheritance/"))).toBe(true);
  });
});
