import { describe, expect, it } from "vitest";
import classification from "../../../docs/learning-assets/drafts/biology-9700-classification.v1.json";
import biodiversity from "../../../docs/learning-assets/drafts/biology-9700-biodiversity-fieldwork.v1.json";
import conservation from "../../../docs/learning-assets/drafts/biology-9700-conservation.v1.json";
const packages = [classification, biodiversity, conservation];
const expected = [...Array.from({ length: 6 }, (_, i) => `18.1.${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `18.2.${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `18.3.${i + 1}`)];
describe("Cambridge Biology 9700 Topic 18 draft assets", () => {
 it("covers all 18 outcomes exactly once", () => { const codes=packages.flatMap(x=>x.curriculum.syllabus_outcome_codes); expect(codes).toHaveLength(18); expect(new Set(codes).size).toBe(18); expect([...codes].sort()).toEqual([...expected].sort()); });
 it("keeps packages draft-only and unmapped", () => { for(const x of packages){expect(x.curriculum.status).toBe("draft");expect(x.review_status).toBe("draft");expect(x.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");} });
 it("requires substantial teaching and answered questions", () => { for(const x of packages){expect(x.content.sections.length).toBeGreaterThanOrEqual(10);expect(x.content.questions.length).toBeGreaterThanOrEqual(10);for(const q of x.content.questions){expect(q.answer.length).toBeGreaterThan(5);expect(q.mark_points.length).toBeGreaterThan(0);}} });
 it("links all fifteen Topic 18 SVG assets", () => { const a=packages.flatMap(x=>x.content.visual_assets);expect(a).toHaveLength(15);expect(a.every(x=>x.path.startsWith("/learning-assets/biology/9700/classification-biodiversity-conservation/"))).toBe(true); });
});