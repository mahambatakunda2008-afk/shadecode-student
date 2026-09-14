import { describe, expect, it } from "vitest";
import { buildObjectiveTestPlan } from "./objective-test-plan";
import { evaluateSourceEvidence } from "./source-checks";

describe("objective test plan", () => {
  it("creates a language-agnostic selection evidence check", () => {
    const plan = buildObjectiveTestPlan({
      id: "selection-1",
      objective_key: "2.3",
      title: "Use selection",
      description: "Make decisions using if and else",
      topic: "Selection",
    });
    const selection = plan.find((item) => item.id.endsWith(":selection"));
    expect(selection).toBeDefined();
    expect(evaluateSourceEvidence(selection!.check, [
      { path: "main.py", content: "if score >= 50:\n    print('pass')" },
    ]).status).toBe("passed");
  });

  it("falls back to non-empty evidence for an objective without a known construct", () => {
    const plan = buildObjectiveTestPlan({
      id: "unknown-1",
      objective_key: "9.9",
      title: "Demonstrate the required technique",
      description: "Apply the technique to the task",
      topic: "Other",
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe("unknown-1:non-empty");
  });
});
