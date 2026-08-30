import { describe, expect, it } from "vitest";

function shouldSync(store: string, operation: string): boolean {
  return (store === "projects" || store === "project_evidence") && ["upsert", "update", "delete"].includes(operation);
}

describe("project offline mutation contract", () => {
  it("supports project and evidence deletes", () => {
    expect(shouldSync("projects", "delete")).toBe(true);
    expect(shouldSync("project_evidence", "delete")).toBe(true);
  });
  it("does not claim unrelated stores", () => {
    expect(shouldSync("tasks", "delete")).toBe(false);
  });
});
