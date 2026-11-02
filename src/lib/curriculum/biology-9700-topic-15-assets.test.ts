import { describe, expect, it } from "vitest";
import mammalian from "../../../docs/learning-assets/drafts/biology-9700-control-coordination-mammalian-systems.v1.json";
import electrical from "../../../docs/learning-assets/drafts/biology-9700-neurone-electrical-signalling.v1.json";
import muscle from "../../../docs/learning-assets/drafts/biology-9700-striated-muscle-contraction.v1.json";
import plants from "../../../docs/learning-assets/drafts/biology-9700-plant-control-coordination.v1.json";

const packages = [mammalian, electrical, muscle, plants];
const expected = [
  ...Array.from({ length: 12 }, (_, i) => `15.1.${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `15.2.${i + 1}`),
];

describe("Cambridge Biology 9700 Topic 15 draft assets", () => {
  it("covers all 15 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(15);
    expect(new Set(codes).size).toBe(15);
    expect([...codes].sort()).toEqual([...expected].sort());
  });

  it("keeps every package draft-only and unmapped", () => {
    for (const item of packages) {
      expect(item.curriculum.status).toBe("draft");
      expect(item.review_status).toBe("draft");
      expect(item.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    }
  });

  it("requires substantive sections and answered questions with mark points", () => {
    for (const item of packages) {
      expect(item.content.sections.length).toBeGreaterThanOrEqual(5);
      expect(item.content.questions.length).toBeGreaterThanOrEqual(6);
      for (const question of item.content.questions) {
        expect(question.answer.length).toBeGreaterThan(5);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
    }
  });

  it("links all eleven Topic 15 SVG assets", () => {
    const assets = packages.flatMap((item) => item.content.visual_assets);
    expect(assets).toHaveLength(11);
    expect(assets.every((asset) => asset.path.startsWith("/learning-assets/biology/9700/control-and-coordination/"))).toBe(true);
  });
});
