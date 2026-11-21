import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cases = [
  { file: "biology-9700-membranes-and-cell-signalling.v1.json", codes: ["4.1.1", "4.1.2", "4.1.3", "4.1.4"], sections: 9, questions: 8 },
  { file: "biology-9700-movement-across-membranes.v1.json", codes: ["4.2.1"], sections: 9, questions: 8 },
  { file: "biology-9700-osmosis-diffusion-and-water-potential.v1.json", codes: ["4.2.2", "4.2.3", "4.2.4", "4.2.5", "4.2.6"], sections: 11, questions: 10 }
];

describe("Cambridge Biology 9700 Topic 4 draft assets (2028–2030)", () => {
  for (const entry of cases) {
    it(`${entry.file} is valid, version-pinned and outcome-mapped`, () => {
      const asset = JSON.parse(readFileSync(join(root, "docs/learning-assets/drafts", entry.file), "utf8"));
      expect(asset.asset_type).toBe("lesson");
      expect(asset.subject_id).toBe("biology");
      expect(asset.review_status).toBe("draft");
      expect(asset.curriculum.status).toBe("draft");
      expect(asset.curriculum.syllabus_version).toBe("2028-2030");
      expect(asset.curriculum.expected_topic_key).toBe("4");
      expect(asset.curriculum.source_reference).toContain("744622-2028-2030-syllabus.pdf");
      expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
      expect(asset.curriculum.syllabus_outcome_codes).toEqual(entry.codes);
      expect(asset.content.learning_objectives.length).toBeGreaterThan(0);
      expect(asset.content.sections.length).toBeGreaterThanOrEqual(entry.sections);
      expect(asset.content.questions.length).toBeGreaterThanOrEqual(entry.questions);
      for (const section of asset.content.sections) {
        expect(section.heading.length).toBeGreaterThan(3);
        expect(section.body.length).toBeGreaterThan(80);
      }
      for (const question of asset.content.questions) {
        expect(question.question.length).toBeGreaterThan(20);
        expect(question.answer.length).toBeGreaterThan(20);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
      for (const visual of asset.content.visual_assets ?? []) {
        const visualPath = join(root, "public", visual.path.startsWith("/") ? visual.path.slice(1) : visual.path);
        expect(existsSync(visualPath)).toBe(true);
        expect(visual.alt.length).toBeGreaterThan(20);
        expect(readFileSync(visualPath, "utf8")).toMatch(/<svg(?:\s|>)/i);
      }
      expect(asset.quality_checks.syllabus_checked).toBe(false);
      expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
      expect(asset.quality_checks.assessment_checked).toBe(false);
      expect(asset.quality_checks.accessibility_checked).toBe(false);
    });
  }
});
