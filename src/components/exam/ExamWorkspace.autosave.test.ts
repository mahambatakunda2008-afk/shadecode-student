import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Exam Sim local autosave feedback", () => {
  it("does not report a save until the durable local persistence sequence completes", () => {
    const workspace = read("src/components/exam/ExamWorkspace.tsx");
    const start = workspace.indexOf("const persist = useCallback");
    const end = workspace.indexOf("}, [count, flags, level", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const persist = workspace.slice(start, end);
    expect(persist).toContain("await saveExamAttempt");
    expect(persist).toContain("await saveWorkObject");
    expect(persist).toContain("await saveStudySession");
    expect(persist).toContain("setSavedAt(Date.now())");
  });

  it("surfaces persistence failures instead of silently swallowing them", () => {
    const workspace = read("src/components/exam/ExamWorkspace.tsx");
    expect(workspace).toContain("setSaveError(\"Your latest changes could not be confirmed as saved.");
    expect(workspace).toContain('saveError ? "Save failed" : savedAt ? "Saved locally"');
    expect(workspace).toContain("Latest changes not saved · keep this exam open");
  });
});
