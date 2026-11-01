import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePaths = [
  "docs/learning-assets/drafts/biology-9700-circulatory-system.v1.json",
  "docs/learning-assets/drafts/biology-9700-gas-transport.v1.json",
  "docs/learning-assets/drafts/biology-9700-heart.v1.json",
];
const expectedCodes = [
  "8.1.1","8.1.2","8.1.3","8.1.4","8.1.5","8.1.6","8.1.7",
  "8.2.1","8.2.2","8.2.3","8.2.4","8.2.5","8.2.6",
  "8.3.1","8.3.2","8.3.3","8.3.4",
];
const packages = packagePaths.map((relativePath) => ({
  path: relativePath,
  data: JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")),
}));

describe("Biology 9700 Topic 8 draft packages", () => {
  it("covers all seventeen Topic 8 outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.data.curriculum.syllabus_outcome_codes);
    expect([...codes].sort()).toEqual([...expectedCodes].sort());
  });
  it("keeps every package draft-only and unmapped to invented UUIDs", () => {
    for (const item of packages) {
      expect(item.data.review_status).toBe("draft");
      expect(item.data.curriculum.status).toBe("draft");
      expect(item.data.curriculum.syllabus_version).toBe("2028-2030");
      expect(item.data.curriculum.expected_topic_key).toBe("8");
      expect(item.data.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
      expect(item.data.quality_checks.syllabus_checked).toBe(false);
      expect(item.data.quality_checks.factual_accuracy_checked).toBe(false);
      expect(item.data.quality_checks.assessment_checked).toBe(false);
      expect(item.data.quality_checks.accessibility_checked).toBe(false);
    }
  });
  it("contains substantive teaching, answered questions and traceable visuals", () => {
    for (const item of packages) {
      expect(item.data.content.sections.length).toBeGreaterThanOrEqual(6);
      expect(item.data.content.questions.length).toBeGreaterThanOrEqual(6);
      for (const section of item.data.content.sections) expect(section.body.length).toBeGreaterThan(80);
      for (const question of item.data.content.questions) {
        expect(question.question.length).toBeGreaterThan(20);
        expect(question.answer.length).toBeGreaterThan(20);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
      expect(item.data.content.visual_assets.length).toBeGreaterThan(0);
    }
  });
  it("provides every referenced original SVG with accessible title and description", () => {
    const referenced = packages.flatMap((item) => item.data.content.visual_assets.map((asset) => asset.path));
    expect(referenced).toHaveLength(10);
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
