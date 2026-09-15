import { describe, expect, it } from "vitest";
import { compareExpectedOutput, getAlgorithmExercise, getAlgorithmObjective, getAssessmentTestCases, getHiddenTestCases, getVisibleTestCases, normalizeOutput, recordAlgorithmEvidence, scoreAlgorithmEvidence } from "./assessment";

describe("Comp Lab algorithm assessment", () => {
  it("normalizes whitespace-only output differences", () => {
    expect(normalizeOutput(" 19 \n\n  ")).toBe("19");
    expect(compareExpectedOutput("19\n", " 19 ")).toEqual({ checked: true, passed: true });
  });
  it("does not mark an exercise when the expected output differs", () => { expect(compareExpectedOutput("18", "19")).toEqual({ checked: true, passed: false }); });
  it("leaves custom exercises unchecked when no expected output exists", () => { expect(compareExpectedOutput("anything")).toEqual({ checked: false, passed: true }); });
  it("keeps exercises linked to explicit learning objectives", () => { const exercise = getAlgorithmExercise("array-total"); expect(exercise?.objectiveId).toBe("alg.arrays"); expect(getAlgorithmObjective(exercise!.objectiveId)?.title).toBe("Arrays and lists"); });
  it("partitions visible and hidden assessment cases", () => { const exercise = getAlgorithmExercise("largest-three")!; expect(getVisibleTestCases(exercise)).toHaveLength(3); expect(getHiddenTestCases(exercise)).toHaveLength(2); expect(getAssessmentTestCases(exercise).find(x => x.id === "hidden-negative")?.expectedOutput).toBe("-3"); });
  it("weights hidden tests without exposing their inputs", () => { const score = scoreAlgorithmEvidence({ executionPassed: 3, executionTotal: 3, hiddenPassed: 1, hiddenTotal: 2 }); expect(score.score).toBeGreaterThan(60); expect(score.score).toBeLessThan(100); });
  it("records compact Learning Graph-ready evidence", () => { const evidence = recordAlgorithmEvidence({ exerciseId: "largest-three", objectiveId: "alg.selection", passed: true, testCount: 3, passedTests: 3, hiddenTestCount: 2, hiddenPassedTests: 2, durationMs: 12.7, traceScore: 1 }); expect(evidence).toMatchObject({ type: "comp-lab.algorithm-assessment", exerciseId: "largest-three", objectiveId: "alg.selection", passed: true, score: 95, testCount: 3, passedTests: 3, hiddenTestCount: 2, hiddenPassedTests: 2, durationMs: 13, dimensions: { execution: 100, testing: 100, tracing: 100 } }); expect(evidence.recordedAt).toEqual(expect.any(String)); });
});