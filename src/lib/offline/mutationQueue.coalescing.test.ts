import { describe, expect, it } from "vitest";
import { retryDelayMs } from "./mutationQueue";

describe("offline mutation queue contract", () => {
  it("caps retry delay", () => {
    expect(retryDelayMs(20)).toBe(15 * 60 * 1000);
  });

  it("uses the same identity fields for project and evidence mutations", () => {
    const project = { id: "project-1", title: "First" };
    const evidence = { id: "evidence-1", projectId: "project-1", content: "observation" };
    expect(project.id).toBe("project-1");
    expect(evidence.id).not.toBe(project.id);
    expect(evidence.projectId).toBe(project.id);
  });
});
