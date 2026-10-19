import { describe, expect, it } from "vitest";
import { buildLearningHelpPrompt, enforceLearningHelpLevel, getLearningHelpAction, LEARNING_HELP_ACTIONS } from "./helpActions";

describe("shared learning help contract", () => {
  it("offers the same five actionable help paths across learning surfaces", () => {
    expect(LEARNING_HELP_ACTIONS.map((action) => action.id)).toEqual([
      "clearer_hint", "more_detail", "different_method", "worked_solution", "why_this_step",
    ]);
    expect(getLearningHelpAction("clearer_hint").level).toBe("hint");
    expect(getLearningHelpAction("more_detail").level).toBe("method");
    expect(getLearningHelpAction("different_method").level).toBe("method");
    expect(getLearningHelpAction("worked_solution").level).toBe("solution");
  });

  it("preserves the real question and includes a student request without losing feedback context", () => {
    expect(buildLearningHelpPrompt("  Solve 2x = 8  ", "Show the steps", "You skipped division")).toBe(
      "Solve 2x = 8\n\nStudent request: Show the steps\n\nExisting feedback to address: You skipped division",
    );
  });

  it("does not create empty context sections", () => {
    expect(buildLearningHelpPrompt("  ", "Try another method")).toBe("Student request: Try another method");
  });
});


describe("help-level disclosure boundaries", () => {
  it("removes full answers from hint responses", () => {
    const result = enforceLearningHelpLevel({
      hint: "Start by dividing both sides by two.",
      method: ["Divide both sides", "Simplify"],
      solution: "The complete worked solution is 2x = 8, so x = 4.",
      finalAnswer: "x = 4",
    }, "hint");

    expect(result.hint).toBe("Start by dividing both sides by two.");
    expect(result.method).toBeUndefined();
    expect(result.solution).toBeUndefined();
    expect(result.finalAnswer).toBeUndefined();
  });

  it("keeps method steps but removes the worked answer from method responses", () => {
    const result = enforceLearningHelpLevel({
      hint: "Isolate x.",
      method: ["Subtract four", "Divide by two"],
      solution: "x = 4",
      finalAnswer: "x = 4",
    }, "method");

    expect(result.method).toEqual(["Subtract four", "Divide by two"]);
    expect(result.solution).toBeUndefined();
    expect(result.finalAnswer).toBeUndefined();
    expect(result.content).toBe("Subtract four\nDivide by two");
  });

  it("preserves full solutions when the student requests them", () => {
    const payload = { hint: "Start here", solution: "x = 4", finalAnswer: "x = 4" };
    expect(enforceLearningHelpLevel(payload, "solution")).toEqual(payload);
  });
});
