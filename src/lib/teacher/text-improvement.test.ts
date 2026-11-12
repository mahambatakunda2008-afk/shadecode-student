import { describe, expect, it } from "vitest";
import { validateTeacherTextImprovement } from "./text-improvement";

describe("teacher text improvement safeguards", () => {
  it("accepts grammar corrections while preserving numeric values", () => {
    expect(validateTeacherTextImprovement("The cells is 2 mm wide.", "The cells are 2 mm wide.")).toMatchObject({ valid: true });
  });
  it("rejects edits that alter numeric values", () => {
    expect(validateTeacherTextImprovement("Use 2.5 cm and 10 g.", "Use 3.5 cm and 10 g.").valid).toBe(false);
  });
  it("preserves repeated values and scientific notation", () => {
    expect(validateTeacherTextImprovement("Set 2, 2 and 3e-4.", "Set 2, 2 and 3e-5.").valid).toBe(false);
  });
  it("preserves equations, variable relationships and mathematical notation", () => {
    expect(validateTeacherTextImprovement("The equation is F = ma and α = 30°.", "The equation is F = ma and β = 30°.").valid).toBe(false);
    expect(validateTeacherTextImprovement("Use v = u + at.", "Use v = u - at.").valid).toBe(false);
    expect(validateTeacherTextImprovement("The result is x² + y² = z².", "The result is x³ + y² = z².").valid).toBe(false);
    expect(validateTeacherTextImprovement("The equation is F = ma.", "The equation is F = ma.")).toMatchObject({ valid: true });
  });
  it("rejects edits that alter inline code or URLs", () => {
    expect(validateTeacherTextImprovement("Use `x + 2` at https://example.com/a.", "Use `x + 3` at https://example.com/a.").valid).toBe(false);
    expect(validateTeacherTextImprovement("Visit https://example.com/a.", "Visit https://example.com/b.").valid).toBe(false);
  });
  it("rejects empty or excessively expanded output", () => {
    expect(validateTeacherTextImprovement("A short label.", "")).toMatchObject({ valid: false });
    expect(validateTeacherTextImprovement("A short label.", "A".repeat(200))).toMatchObject({ valid: false });
  });
});
