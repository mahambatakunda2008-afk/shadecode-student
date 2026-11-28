import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isServerRelayStore } from "./sync";

describe("offline sync adapter routing", () => {
  it("sends only revision-relay stores through /api/sync", () => {
    expect(isServerRelayStore("tasks")).toBe(true);
    expect(isServerRelayStore("subjects")).toBe(true);
    expect(isServerRelayStore("learn_lessons")).toBe(true);
    expect(isServerRelayStore("projects")).toBe(false);
    expect(isServerRelayStore("project_evidence")).toBe(false);
    expect(isServerRelayStore("project_milestones")).toBe(false);
    expect(isServerRelayStore("exam_attempts")).toBe(false);
  });

  it("runs the dedicated project adapter before the generic revision relay", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/offline/sync.ts"), "utf8");
    expect(source).toMatch(/await this\\.bridgeLocalOperations\\(\\);\\s*await syncProjectMutations\\(\\);\\s*await this\\.syncMutations\\(\\)/);
    expect(source).toMatch(/listReady\\(user\\.id\\)\\)\\.filter\\(\\(item\\) => isServerRelayStore\\(item\\.store\\)\\)/);
  });
});
