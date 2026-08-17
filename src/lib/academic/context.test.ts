import { describe, expect, it } from "vitest";
import { normalizeAcademicContext } from "./context";

describe("normalizeAcademicContext", () => {
  it("normalizes a valid university context", () => {
    expect(normalizeAcademicContext({
      pathway: "university",
      institution: "  University of Zimbabwe ",
      programme: " Computer Science ",
      year_level: "2",
      semester: "1",
      courses: ["Data Structures", " Operating Systems ", 42],
    })).toEqual({
      pathway: "university",
      institution: "University of Zimbabwe",
      programme: "Computer Science",
      year_level: "2",
      semester: "1",
      courses: ["Data Structures", "Operating Systems"],
    });
  });

  it("rejects unsupported pathways and missing programmes", () => {
    expect(() => normalizeAcademicContext({ pathway: "secondary", programme: "Math" })).toThrow();
    expect(() => normalizeAcademicContext({ pathway: "tvet" })).toThrow("programme is required");
  });

  it("bounds user-controlled strings and course count", () => {
    const context = normalizeAcademicContext({
      pathway: "tvet",
      programme: "x".repeat(500),
      institution: "y".repeat(500),
      courses: Array.from({ length: 40 }, (_, index) => `${index}-${"z".repeat(200)}`),
    });

    expect(context.programme).toHaveLength(200);
    expect(context.institution).toHaveLength(200);
    expect(context.courses).toHaveLength(30);
    expect(context.courses.every((course) => course.length <= 160)).toBe(true);
  });
});
