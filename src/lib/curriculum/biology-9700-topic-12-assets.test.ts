import { describe, expect, it } from "vitest";
import energy from "../../../docs/learning-assets/drafts/biology-9700-topic-12-energy-rq.v1.json";
import respiration from "../../../docs/learning-assets/drafts/biology-9700-cellular-respiration.v1.json";
const packages = [energy, respiration];
const expected = [...Array.from({ length: 7 }, (_, i) => `12.1.${i + 1}`), ...Array.from({ length: 14 }, (_, i) => `12.2.${i + 1}`)];
describe("Cambridge Biology 9700 Topic 12 draft assets", () => {
  it("covers all 21 syllabus outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.curriculum.syllabus_outcome_codes);
    expect(codes).toHaveLength(21);
    expect(new Set(codes).size).toBe(21);
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
});
