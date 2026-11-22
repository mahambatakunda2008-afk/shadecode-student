import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packages = [
  { path: "docs/learning-assets/drafts/biology-9700-infectious-diseases.v1.json", codes: ["10.1.1","10.1.2","10.1.3","10.1.4"], minSections: 8, minQuestions: 12, visuals: 4, topic: "10" },
  { path: "docs/learning-assets/drafts/biology-9700-antibiotics-resistance.v1.json", codes: ["10.2.1","10.2.2"], minSections: 7, minQuestions: 12, visuals: 2, topic: "10" }
];

describe("Biology 9700 Topic 10 infectious diseases draft packages", () => {
  for (const item of packages) {
    const asset = JSON.parse(fs.readFileSync(path.join(root, item.path), "utf8"));
    describe(asset.title, () => {
      it("covers the intended syllabus outcomes exactly once", () => {
        expect([...asset.curriculum.syllabus_outcome_codes].sort()).toEqual([...item.codes].sort());
      });
      it("remains draft-only with no fabricated objective UUID mapping", () => {
        expect(asset.review_status).toBe("draft");
        expect(asset.curriculum.status).toBe("draft");
        expect(asset.curriculum.syllabus_version).toBe("2028-2030");
        expect(asset.curriculum.expected_topic_key).toBe(item.topic);
        expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
        expect(asset.quality_checks.syllabus_checked).toBe(false);
        expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
        expect(asset.quality_checks.assessment_checked).toBe(false);
        expect(asset.quality_checks.accessibility_checked).toBe(false);
      });
      it("contains substantive teaching and fully marked original questions", () => {
        expect(asset.content.sections.length).toBeGreaterThanOrEqual(item.minSections);
        expect(asset.content.questions.length).toBeGreaterThanOrEqual(item.minQuestions);
        for (const section of asset.content.sections) expect(section.body.length).toBeGreaterThan(100);
        for (const question of asset.content.questions) {
          expect(question.question.length).toBeGreaterThan(20);
          expect(question.answer.length).toBeGreaterThan(20);
          expect(question.mark_points.length).toBeGreaterThan(0);
        }
      });
      it("provides unique referenced SVGs with accessible title and description", () => {
        const referenced = asset.content.visual_assets.map((visual) => visual.path);
        expect(referenced).toHaveLength(item.visuals);
        expect(new Set(referenced).size).toBe(item.visuals);
        for (const publicPath of referenced) {
          const relativePath = path.join("public", publicPath.substring(1));
          expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
          const svg = fs.readFileSync(path.join(root, relativePath), "utf8");
          expect(svg).toMatch(/^<svg /);
          expect(svg).toContain("<title");
          expect(svg).toContain("<desc");
        }
      });
    });
  }
});
