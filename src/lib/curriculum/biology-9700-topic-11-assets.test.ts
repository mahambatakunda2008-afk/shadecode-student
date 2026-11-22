import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packages = [
  { path: "docs/learning-assets/drafts/biology-9700-immune-system.v1.json", codes: ["11.1.1","11.1.2","11.1.3","11.1.4"], sections: 10, questions: 14, visuals: 2 },
  { path: "docs/learning-assets/drafts/biology-9700-antibodies-vaccination.v1.json", codes: ["11.2.1","11.2.2","11.2.3","11.2.4","11.2.5","11.2.6"], sections: 10, questions: 16, visuals: 4 }
];

describe("Biology 9700 Topic 11 immunity draft packages", () => {
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
        expect(asset.curriculum.expected_topic_key).toBe("11");
        expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
        expect(asset.quality_checks.syllabus_checked).toBe(false);
        expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
        expect(asset.quality_checks.assessment_checked).toBe(false);
        expect(asset.quality_checks.accessibility_checked).toBe(false);
      });
      it("contains substantive teaching and fully marked original questions", () => {
        expect(asset.content.sections.length).toBeGreaterThanOrEqual(item.sections);
        expect(asset.content.questions.length).toBeGreaterThanOrEqual(item.questions);
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
