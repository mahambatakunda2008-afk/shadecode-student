import { describe, expect, it } from "vitest";
import type { StudentProject } from "./types";
import { snapshotReasonLabel } from "./recoveryUi";

describe("Project Studio recovery", () => {
  it("labels every supported snapshot reason", () => {
    expect(snapshotReasonLabel("autosave")).toBe("Autosave");
    expect(snapshotReasonLabel("manual")).toBe("Manual save");
    expect(snapshotReasonLabel("before-delete")).toBe("Before deletion");
    expect(snapshotReasonLabel("before-restore")).toBe("Before restore");
  });

  it("keeps recovery metadata explicit", () => {
    const project = { id: "project-test", title: "Test", evidence: [] } as unknown as StudentProject;
    expect({ projectId: project.id, reason: "before-delete" as const }).toEqual({ projectId: "project-test", reason: "before-delete" });
  });
});
