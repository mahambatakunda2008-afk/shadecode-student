import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Live public.learn_lessons columns (verified against production 2026-11-18). Production logs showed
// repeated HTTP 400s because code selected columns that do not exist (time_spent, attempts, subject).
const LIVE_COLUMNS = new Set([
  "id", "user_id", "subject_id", "title", "description", "difficulty", "progress", "blocks",
  "created_at", "updated_at", "topic", "curriculum_version_id", "curriculum_objective_keys", "curriculum_coverage",
]);

const FILES = [
  "src/lib/student-intelligence/services/progress.ts",
  "src/lib/student-intelligence/services/performance.ts",
  "src/app/api/learn/route.ts",
];

describe("learn_lessons column contract", () => {
  for (const file of FILES) {
    it(`${file} only selects columns that exist in production`, () => {
      const source = readFileSync(file, "utf8");
      const selects = [...source.matchAll(/from\("learn_lessons"\)\s*\.select\("([^"]+)"\)/g)];
      expect(selects.length).toBeGreaterThan(0);
      for (const [, list] of selects) {
        const missing = list.split(",").map((c) => c.trim()).filter((c) => !LIVE_COLUMNS.has(c));
        expect(missing).toEqual([]);
      }
    });
  }

  it("progress service never writes time_spent or attempts to learn_lessons", () => {
    const source = readFileSync("src/lib/student-intelligence/services/progress.ts", "utf8");
    expect(source).not.toMatch(/time_spent:|attempts:\s*progress/);
  });

  it("/api/learn answers 404 for a non-UUID lessonId before querying", () => {
    const source = readFileSync("src/app/api/learn/route.ts", "utf8");
    expect(source.indexOf("Lesson not found.")).toBeLessThan(source.indexOf('.eq("id", lessonId).maybeSingle()'));
    expect(source).toContain("[0-9a-f]{8}-[0-9a-f]{4}");
  });

  it("PATCH rejects non-UUID lesson IDs before the progress update query", () => {
    const source = readFileSync("src/app/api/learn/route.ts", "utf8");
    const patchHandler = source.slice(source.indexOf("export async function PATCH"));
    const guard = patchHandler.indexOf("if (!isUuid(lessonId))");
    const query = patchHandler.indexOf('.eq("id", lessonId)');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(query).toBeGreaterThan(guard);
    expect(patchHandler).toContain('status: 404');
  });
});
