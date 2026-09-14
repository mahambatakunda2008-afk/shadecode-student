import { describe, expect, it } from "vitest";
import { compareExpectedOutput, getAlgorithmExercise, getAlgorithmObjective, normalizeOutput, recordAlgorithmEvidence } from "./assessment";

describe("Comp Lab algorithm assessment", () => {
  it("normalizes whitespace-only output differences", () => {
    expect(normalizeOutput(" 19 \n\n  ")).toBe("19");
    expect(compareExpectedOutput("19\n", " 19 ")).toEqual({ checked: true, passed: true });
  });

  it("does not mark an exercise when the expected output differs", () => {
    expect(compareExpectedOutput("18", "19")).toEqual({ checked: true, passed: false });
  });

  it("leaves custom exercises unchecked when no expected output exists", () => {
    expect(compareExpectedOutput("anything")).toEqual({ checked: false, passed: true });
  });

  it("keeps exercises linked to explicit learning objectives", () => {
    const exercise = getAlgorithmExercise("array-total");
    expect(exercise?.objectiveId).toBe("alg.arrays");
    expect(getAlgorithmObjective(exercise!.objectiveId)?.title).toBe("Arrays and lists");
  });

  it("records compact learning evidence", () => {
    const evidence = recordAlgorithmEvidence({
      exerciseId: "largest-three",
      objectiveId: "alg.selection",
      passed: true,
      testCount: 3,
      durationMs: 12.7,
    });

    expect(evidence).toMatchObject({
      type: "comp-lab.algorithm-assessment",
      exerciseId: "largest-three",
      objectiveId: "alg.selection",
      passed: true,
      testCount: 3,
      durationMs: 13,
    });
    expect(evidence.recordedAt).toEqual(expect.any(String));
  });
});
