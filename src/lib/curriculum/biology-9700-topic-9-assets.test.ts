import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = "docs/learning-assets/drafts/biology-9700-gas-exchange-system.v1.json";
const expectedCodes = ["9.1.1","9.1.2","9.1.3","9.1.4","9.1.5","9.1.6","9.1.7"];
const asset = JSON.parse(fs.readFileSync(path.join(root, packagePath), "utf8"));

describe("Biology 9700 Topic 9 gas exchange draft package", () => {
  it("covers all seven Topic 9 outcomes exactly once", () => {
    expect([...asset.curriculum.syllabus_outcome_codes].sort()).toEqual([...expectedCodes].sort());
  });
  it("remains draft-only and does not invent database objective UUIDs", () => {
    expect(asset.review_status).toBe("draft");
    expect(asset.curriculum.status).toBe("draft");
    expect(asset.curriculum.syllabus_version).toBe("2028-2030");
    expect(asset.curriculum.expected_topic_key).toBe("9");
    expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    expect(asset.quality_checks.syllabus_checked).toBe(false);
    expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
    expect(asset.quality_checks.assessment_checked).toBe(false);
    expect(asset.quality_checks.accessibility_checked).toBe(false);
  });
  it("contains substantive sections and fully answered original questions", () => {
    expect(asset.content.sections.length).toBeGreaterThanOrEqual(9);
    expect(asset.content.questions.length).toBeGreaterThanOrEqual(12);
    for (const section of asset.content.sections) expect(section.body.length).toBeGreaterThan(80);
    for (const question of asset.content.questions) {
      expect(question.question.length).toBeGreaterThan(20);
      expect(question.answer.length).toBeGreaterThan(20);
      expect(question.mark_points.length).toBeGreaterThan(0);
    }
  });
  it("provides all referenced SVGs with accessible title and description", () => {
    const referenced = asset.content.visual_assets.map((visual) => visual.path);
    expect(referenced).toHaveLength(6);
    expect(new Set(referenced).size).toBe(6);
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
