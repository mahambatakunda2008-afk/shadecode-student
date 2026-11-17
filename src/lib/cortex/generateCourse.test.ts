import { describe, expect, it } from "vitest";
import { resolveDraftInstitutionScope } from "./generateCourse";

describe("generated course institution scope", () => {
  it("assigns the only active institution without trusting client input", () => {
    expect(resolveDraftInstitutionScope([
      { institution_id: "school-a", status: "active" },
    ])).toBe("school-a");
  });

  it("keeps independent learners unscoped when they have no active membership", () => {
    expect(resolveDraftInstitutionScope([])).toBeNull();
    expect(resolveDraftInstitutionScope([
      { institution_id: "old-school", status: "inactive" },
    ])).toBeNull();
  });

  it("requires an explicit institution when the learner has multiple active memberships", () => {
    expect(() => resolveDraftInstitutionScope([
      { institution_id: "school-a", status: "active" },
      { institution_id: "school-b", status: "active" },
    ])).toThrow("INSTITUTION_SELECTION_REQUIRED");
  });

  it("accepts an explicit institution only when it is an active membership", () => {
    expect(resolveDraftInstitutionScope([
      { institution_id: "school-a", status: "active" },
      { institution_id: "school-b", status: "active" },
    ], "school-b")).toBe("school-b");
    expect(() => resolveDraftInstitutionScope([
      { institution_id: "school-a", status: "active" },
    ], "school-b")).toThrow("FORBIDDEN_INSTITUTION_SCOPE");
  });

  it("deduplicates memberships and ignores inactive institutions", () => {
    expect(resolveDraftInstitutionScope([
      { institution_id: "school-a", status: "active" },
      { institution_id: "school-a", status: "active" },
      { institution_id: "school-b", status: "inactive" },
    ])).toBe("school-a");
  });
});
