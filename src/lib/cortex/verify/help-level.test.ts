import { describe, expect, it } from "vitest";
import { isValidHelpResult, selectHelpResult } from "./help-level";

describe("Cortex Verify help-level contract", () => {
  it("accepts a hint only when the hint itself is substantive", () => {
    expect(isValidHelpResult({ hint: "Try isolating the unknown before substituting." }, "hint")).toBe(true);
    expect(isValidHelpResult({ method: "Rearrange the equation first, then substitute." }, "hint")).toBe(false);
  });

  it("accepts a method only when the method itself is substantive", () => {
    expect(isValidHelpResult({ method: "Rearrange the equation, then substitute the known values." }, "method")).toBe(true);
    expect(isValidHelpResult({ hint: "Try rearranging first." }, "method")).toBe(false);
  });

  it("accepts a complete solution from either solution or content", () => {
    expect(isValidHelpResult({ solution: "First rearrange the equation, then substitute and simplify." }, "solution")).toBe(true);
    expect(isValidHelpResult({ content: "First rearrange the equation, then substitute and simplify." }, "solution")).toBe(true);
  });

  it("strips solution and final-answer fields from hint responses", () => {
    expect(selectHelpResult({
      hint: "Try isolating the unknown before substituting.",
      method: "Rearrange the equation.",
      solution: "x = 4",
      finalAnswer: "4",
      content: "The answer is four.",
    }, "hint")).toEqual({
      level: "hint",
      hint: "Try isolating the unknown before substituting.",
    });
  });

  it("strips final-answer fields from method responses", () => {
    expect(selectHelpResult({
      method: "Rearrange the equation, then substitute the known values.",
      solution: "x = 4",
      finalAnswer: "4",
    }, "method")).toEqual({
      level: "method",
      method: "Rearrange the equation, then substitute the known values.",
    });
  });

  it("preserves a complete solution only when solution was requested", () => {
    expect(selectHelpResult({
      solution: "Rearrange, substitute, and simplify.",
      finalAnswer: "4",
    }, "solution")).toEqual({
      level: "solution",
      solution: "Rearrange, substitute, and simplify.",
      finalAnswer: "4",
    });
  });
});
