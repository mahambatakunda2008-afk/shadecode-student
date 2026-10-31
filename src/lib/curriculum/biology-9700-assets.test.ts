import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const draftPaths = [
  "docs/learning-assets/drafts/biology-9700-meiosis.v1.json",
  "docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json",
  "docs/learning-assets/drafts/biology-9700-gene-control.v1.json",
];

describe("Cambridge Biology 9700 Topic 16 draft assets", () => {
  it("keeps every visual asset local, accessible and linked from its draft lesson", () => {
    for (const draftPath of draftPaths) {
      const absolutePath = join(process.cwd(), draftPath);
      const asset = JSON.parse(readFileSync(absolutePath, "utf8")) as {
        asset_key: string;
        curriculum: { syllabus_id: string; syllabus_version: string; expected_topic_key: string };
        review_status: string;
        content: {
          visual_assets?: Array<{ path: string; alt: string; caption: string }>;
          visual_tasks?: Array<{ image?: string; alt?: string }>;
          sources?: Array<{ title: string; url: string; use: string }>;
        };
      };

      expect(asset.asset_key).toMatch(/^biology-9700-/);
      expect(asset.curriculum.syllabus_id).toBe("cambridge-9700");
      expect(asset.curriculum.syllabus_version).toBe("2025-2027");
      expect(asset.curriculum.expected_topic_key).toBe("16");
      expect(asset.review_status).toBe("draft");
      expect(asset.content.sources?.length).toBeGreaterThan(0);

      for (const visual of asset.content.visual_assets ?? []) {
        expect(visual.alt.trim().length).toBeGreaterThan(10);
        expect(visual.caption.trim().length).toBeGreaterThan(10);
        expect(existsSync(join(process.cwd(), "public", visual.path.replace(/^\//, "")))).toBe(true);
      }

      for (const task of asset.content.visual_tasks ?? []) {
        if (task.image) {
          expect(task.alt?.trim().length).toBeGreaterThan(10);
          expect(existsSync(join(process.cwd(), "public", task.image.replace(/^\//, "")))).toBe(true);
        }
      }
    }
  });
  it("requires assessable practice and explicit success criteria in every Topic 16 draft", () => {
    for (const draftPath of draftPaths) {
      const asset = JSON.parse(readFileSync(join(process.cwd(), draftPath), "utf8")) as {
        content: {
          practice?: Array<{ question: string; answer: string; mark_points?: string[] }>;
          visual_tasks?: Array<{ instruction: string; expected_features?: string[] }>;
        };
      };

      expect(asset.content.practice?.length).toBeGreaterThanOrEqual(8);
      for (const question of asset.content.practice ?? []) {
        expect(question.question.trim().length).toBeGreaterThan(20);
        expect(question.answer.trim().length).toBeGreaterThan(20);
        expect(question.mark_points?.length).toBeGreaterThanOrEqual(2);
        for (const point of question.mark_points ?? []) {
          expect(point.trim().length).toBeGreaterThan(3);
        }
      }

      for (const task of asset.content.visual_tasks ?? []) {
        expect(task.instruction.trim().length).toBeGreaterThan(20);
        expect(task.expected_features?.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("covers every numbered Topic 16 syllabus outcome without publishing or inventing database mappings", () => {
    const expectedByFile: Record<string, string[]> = {
      "docs/learning-assets/drafts/biology-9700-meiosis.v1.json": [
        "16.1.1", "16.1.2", "16.1.3", "16.1.4", "16.1.5", "16.1.6", "16.1.7",
      ],
      "docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json": [
        "16.2.1", "16.2.2", "16.2.3", "16.2.4", "16.2.5", "16.2.6", "16.2.7",
      ],
      "docs/learning-assets/drafts/biology-9700-gene-control.v1.json": [
        "16.3.1", "16.3.2", "16.3.3", "16.3.4",
      ],
    };

    for (const [draftPath, expectedCodes] of Object.entries(expectedByFile)) {
      const asset = JSON.parse(readFileSync(join(process.cwd(), draftPath), "utf8")) as {
        review_status: string;
        curriculum: {
          syllabus_outcome_codes?: string[];
          objective_mapping_status?: string;
        };
      };
      expect(asset.review_status).toBe("draft");
      expect(asset.curriculum.syllabus_outcome_codes).toEqual(expectedCodes);
      expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    }
  });

});
