import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cases = [
  { file: "biology-9700-mode-of-action-enzymes.v1.json", codes: ["3.1.1", "3.1.2", "3.1.3", "3.1.4"], sections: 9, questions: 7 },
  { file: "biology-9700-factors-affecting-enzyme-action.v1.json", codes: ["3.2.1", "3.2.2", "3.2.3", "3.2.4"], sections: 10, questions: 8 },
] as const;

describe("Cambridge Biology 9700 Topic 3 draft assets (2028–2030)", () => {
  for (const entry of cases) {
    it(`${entry.file} is valid, version-pinned and outcome-mapped`, () => {
      const asset = JSON.parse(readFileSync(join(root, "docs/learning-assets/drafts", entry.file), "utf8"));
      expect(asset.asset_type).toBe("lesson");
      expect(asset.subject_id).toBe("biology");
      expect(asset.review_status).toBe("draft");
      expect(asset.curriculum.status).toBe("draft");
      expect(asset.curriculum.syllabus_version).toBe("2028-2030");
      expect(asset.curriculum.expected_topic_key).toBe("3");
      expect(asset.curriculum.source_reference).toContain("744622-2028-2030-syllabus.pdf");
      expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
      expect(asset.curriculum.syllabus_outcome_codes).toEqual(entry.codes);
      expect(asset.content.learning_objectives.length).toBeGreaterThan(0);
      expect(asset.content.sections.length).toBeGreaterThanOrEqual(entry.sections);
      expect(asset.content.questions.length).toBeGreaterThanOrEqual(entry.questions);
      for (const question of asset.content.questions) {
        expect(question.question.length).toBeGreaterThan(20);
        expect(question.answer.length).toBeGreaterThan(20);
        expect(question.mark_points.length).toBeGreaterThan(0);
      }
      for (const visual of asset.content.visual_assets ?? []) {
        expect(existsSync(join(root, "public", visual.path.startsWith("/") ? visual.path.slice(1) : visual.path))).toBe(true);
        expect(visual.alt.length).toBeGreaterThan(20);
      }
      expect(asset.quality_checks.syllabus_checked).toBe(false);
      expect(asset.quality_checks.factual_accuracy_checked).toBe(false);
      expect(asset.quality_checks.assessment_checked).toBe(false);
      expect(asset.quality_checks.accessibility_checked).toBe(false);
    });
  }
});
