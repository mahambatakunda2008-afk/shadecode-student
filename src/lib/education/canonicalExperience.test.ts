import { describe, expect, it } from "vitest";
import { resolveCanonicalEducationStage } from "./canonicalExperience";

describe("resolveCanonicalEducationStage", () => {
  it("keeps primary grades together while preserving primary as the UI stage", () => {
    expect(resolveCanonicalEducationStage({ grade: "Grade 2" })).toBe("primary");
    expect(resolveCanonicalEducationStage({ grade: 7 })).toBe("primary");
  });

  it("maps secondary and sixth-form grades", () => {
    expect(resolveCanonicalEducationStage({ grade: "8" })).toBe("lower-secondary");
    expect(resolveCanonicalEducationStage({ grade: 11 })).toBe("lower-secondary");
    expect(resolveCanonicalEducationStage({ grade: 12 })).toBe("upper-secondary");
    expect(resolveCanonicalEducationStage({ grade: 13 })).toBe("a-level");
  });

  it("accepts explicit local stages before grade inference", () => {
    expect(resolveCanonicalEducationStage({ stage: "a-level", grade: 7 })).toBe("a-level");
    expect(resolveCanonicalEducationStage({ educationStage: "polytechnic" })).toBe("tvet");
  });

  it("supports common Zimbabwe-style aliases", () => {
    expect(resolveCanonicalEducationStage({ stage: "O-Level" })).toBe("upper-secondary");
    expect(resolveCanonicalEducationStage({ stage: "Sixth Form" })).toBe("a-level");
  });
});
