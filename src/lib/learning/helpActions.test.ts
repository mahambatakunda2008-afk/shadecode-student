import { describe, expect, it } from "vitest";
import { buildLearningHelpPrompt, getLearningHelpAction, LEARNING_HELP_ACTIONS } from "./helpActions";

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
