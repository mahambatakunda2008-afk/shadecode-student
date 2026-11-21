import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cases = [
  {
    file: "biology-9700-testing-biological-molecules.v1.json",
    codes: ["2.1.1", "2.1.2", "2.1.3"],
    minimumSections: 7,
    minimumQuestions: 5,
  },
  {
    file: "biology-9700-carbohydrates-and-lipids.v1.json",
    codes: ["2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5", "2.2.6", "2.2.7", "2.2.8", "2.2.9", "2.2.10", "2.2.11"],
    minimumSections: 10,
    minimumQuestions: 8,
  },
  {
    file: "biology-9700-proteins.v1.json",
    codes: ["2.3.1", "2.3.2", "2.3.3", "2.3.4", "2.3.5", "2.3.6", "2.3.7", "2.3.8"],
    minimumSections: 10,
    minimumQuestions: 8,
  },
  {
    file: "biology-9700-water.v1.json",
    codes: ["2.4.1"],
    minimumSections: 5,
    minimumQuestions: 4,
  },
] as const;

describe("Cambridge Biology 9700 Topic 2 draft assets (2028–2030)", () => {
  for (const entry of cases) {
    it(`${entry.file} is valid, version-pinned and outcome-mapped`, () => {
      const path = join(root, "docs/learning-assets/drafts", entry.file);
      const asset = JSON.parse(readFileSync(path, "utf8"));

      expect(asset.asset_type).toBe("lesson");
      expect(asset.subject_id).toBe("biology");
      expect(asset.review_status).toBe("draft");
      expect(asset.curriculum.status).toBe("draft");
      expect(asset.curriculum.syllabus_version).toBe("2028-2030");
      expect(asset.curriculum.expected_topic_key).toBe("2");
      expect(asset.curriculum.source_reference).toContain("744622-2028-2030-syllabus.pdf");
      expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
      expect(asset.curriculum.syllabus_outcome_codes).toEqual(entry.codes);
      expect(asset.content.learning_objectives.length).toBeGreaterThan(0);
      expect(asset.content.sections.length).toBeGreaterThanOrEqual(entry.minimumSections);
      expect(asset.content.questions.length).toBeGreaterThanOrEqual(entry.minimumQuestions);

      for (const question of asset.content.questions) {
        expect(question.question.length).toBeGreaterThan(20);
        expect(question.answer.length).toBeGreaterThan(20);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
      expect(asset.quality_checks.syllabus_checked).toBe(false);
      expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
      expect(asset.quality_checks.assessment_checked).toBe(false);
      expect(asset.quality_checks.accessibility_checked).toBe(false);
      for (const visual of asset.content.visual_assets ?? []) {
        expect(existsSync(join(root, "public", visual.path.startsWith("/") ? visual.path.slice(1) : visual.path))).toBe(true);
        expect(visual.alt.length).toBeGreaterThan(20);
      }
    });
  }

  it("all referenced original SVG teaching diagrams exist", () => {
    const paths = [
      "/learning-assets/biology/9700/biological-molecules/glucose-anomers.svg",
      "/learning-assets/biology/9700/biological-molecules/storage-and-structural-polysaccharides.svg",
      "/learning-assets/biology/9700/biological-molecules/triglyceride-phospholipid.svg",
      "/learning-assets/biology/9700/biological-molecules/amino-acid-peptide-bond.svg",
      "/learning-assets/biology/9700/biological-molecules/protein-structure-levels.svg",
      "/learning-assets/biology/9700/biological-molecules/haemoglobin-collagen.svg",
    ];
    for (const assetPath of paths) {
      expect(existsSync(join(root, "public", assetPath.slice(1)))).toBe(true);
    }
  });
});
