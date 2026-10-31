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
});
