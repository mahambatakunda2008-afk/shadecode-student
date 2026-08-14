import { describe, expect, it } from "vitest";
import { normalizeAcademicContext } from "../context";

describe("normalizeAcademicContext", () => {
  it("preserves A-Level as its own pathway", () => {
    const result = normalizeAcademicContext({
      study_level: "a-level",
      education_level: "secondary",
      learning_goal: "exam_preparation",
      subject_interests: ["mathematics", "physics"],
    });

    expect(result.pathway).toBe("a_level");
    expect(result.educationLevel).toBe("secondary");
  });

  it("normalizes university and professional pathways", () => {
    expect(
      normalizeAcademicContext({ study_level: "university" }).pathway
    ).toBe("university");
    expect(
      normalizeAcademicContext({ study_level: "professional" }).pathway
    ).toBe("tvet");
  });

  it("deduplicates subject interests without inventing data", () => {
    const result = normalizeAcademicContext({
      education_level: "university",
      subject_interests: ["computer_science", "computer_science", "physics"],
    });

    expect(result.subjectInterests).toEqual(["computer_science", "physics"]);
    expect(result.institution).toBeNull();
    expect(result.programme).toBeNull();
    expect(result.courses).toEqual([]);
    expect(result.assessments).toEqual([]);
  });

  it("supports tertiary academic context without requiring an institution", () => {
    const result = normalizeAcademicContext({
      education_level: "university",
      learning_goal: "skill_development",
      programme: { name: "BSc Computer Science", qualification: "Bachelor's degree" },
      courses: [{ code: "CSC101", name: "Programming Fundamentals", credits: 3 }],
      assessments: [{ title: "Programming Assignment 1", type: "assignment" }],
    });

    expect(result.pathway).toBe("university");
    expect(result.programme?.name).toBe("BSc Computer Science");
    expect(result.courses[0].code).toBe("CSC101");
    expect(result.assessments[0].type).toBe("assignment");
    expect(result.institution).toBeNull();
  });
});
