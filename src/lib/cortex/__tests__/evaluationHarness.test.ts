import { describe, expect, it } from "vitest";
import { runEvaluationScenario, runEvaluationSuite, type EvaluationScenario } from "../evaluationHarness";

const candidate = {
  id: "algebra",
  type: "revision" as const,
  mastery: 25,
  retentionRisk: 85,
  examUrgency: 70,
  prerequisiteValue: 80,
  goalAlignment: 70,
  curriculumGap: 75,
  trendRisk: 70,
  uncertainty: 80,
  momentum: 25,
  estimatedMinutes: 15,
};

const scenario: EvaluationScenario = {
  id: "weak-algebra",
  topicId: "algebra",
  candidates: [candidate],
  events: [
    { type: "question_answered", topicId: "algebra", correct: false, difficulty: 70 },
    { type: "question_answered", topicId: "algebra", correct: true, difficulty: 80 },
  ],
};

describe("Cortex evaluation harness", () => {
  it("replays a scenario and returns a decision plus final state", () => {
    const result = runEvaluationScenario(scenario);
    expect(result.decision?.candidate.id).toBe("algebra");
    expect(result.finalMastery).toBeDefined();
    expect(result.finalUncertainty).toBeLessThan(80);
  });

  it("runs a suite deterministically", () => {
    const first = runEvaluationSuite([scenario, { ...scenario, id: "copy" }]);
    const second = runEvaluationSuite([scenario, { ...scenario, id: "copy" }]);
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
  });
});
