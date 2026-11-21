import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePaths = [
  "docs/learning-assets/drafts/biology-9700-nucleic-acids-and-dna-replication.v1.json",
  "docs/learning-assets/drafts/biology-9700-gene-expression-and-protein-synthesis.v1.json",
];
const expectedCodes = ["6.1.1","6.1.2","6.1.3","6.1.4","6.1.5","6.2.1","6.2.2","6.2.3","6.2.4","6.2.5","6.2.6","6.2.7"];
const visualPaths = [
  "public/learning-assets/biology/9700/nucleic-acids/dna-double-helix.svg",
  "public/learning-assets/biology/9700/nucleic-acids/dna-replication.svg",
  "public/learning-assets/biology/9700/nucleic-acids/leading-lagging-strands.svg",
  "public/learning-assets/biology/9700/nucleic-acids/transcription-translation.svg",
  "public/learning-assets/biology/9700/nucleic-acids/gene-mutation-effects.svg",
];

const packages = packagePaths.map((relativePath) => ({
  path: relativePath,
  data: JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")),
}));

describe("Biology 9700 Topic 6 draft packages", () => {
  it("covers all twelve Topic 6 outcomes exactly once", () => {
    const codes = packages.flatMap((item) => item.data.curriculum.syllabus_outcome_codes);
    expect(codes.sort()).toEqual([...expectedCodes].sort());
  });

  it("keeps every package draft-only and unmapped to invented UUIDs", () => {
    for (const item of packages) {
      expect(item.data.review_status).toBe("draft");
      expect(item.data.curriculum.status).toBe("draft");
      expect(item.data.curriculum.syllabus_version).toBe("2028-2030");
      expect(item.data.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
      expect(item.data.quality_checks.syllabus_checked).toBe(false);
      expect(item.data.quality_checks.factual_accuracy_checked).toBe(false);
      expect(item.data.quality_checks.assessment_checked).toBe(false);
      expect(item.data.quality_checks.accessibility_checked).toBe(false);
    }
  });

  it("contains substantive teaching, answered questions and traceable visuals", () => {
    for (const item of packages) {
      expect(item.data.content.sections.length).toBeGreaterThanOrEqual(8);
      expect(item.data.content.questions.length).toBeGreaterThanOrEqual(8);
      for (const question of item.data.content.questions) {
        expect(question.question.length).toBeGreaterThan(20);
        expect(question.answer.length).toBeGreaterThan(20);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
      expect(item.data.content.visual_assets.length).toBeGreaterThan(0);
    }
  });

  it("provides every referenced original SVG", () => {
    const referenced = packages.flatMap((item) => item.data.content.visual_assets.map((asset) => asset.path));
    for (const relativePath of visualPaths) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    }
    for (const relativePath of referenced) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    }
  });

  it("uses accessible SVG roots with titles and descriptions", () => {
    for (const relativePath of visualPaths) {
      const svg = fs.readFileSync(path.join(root, relativePath), "utf8");
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain("<title");
      expect(svg).toContain("<desc");
    }
  });
});
