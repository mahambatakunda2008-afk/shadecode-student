import { describe, expect, it } from "vitest";
import { runEvaluationScenario, runEvaluationSuite, type EvaluationScenario } from "../evaluationHarness";

const algebraCandidate = {
  id: "algebra-revision",
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

const physicsCandidate = {
  id: "physics-review",
  type: "review" as const,
  mastery: 82,
  retentionRisk: 20,
  examUrgency: 25,
  prerequisiteValue: 20,
  goalAlignment: 60,
  curriculumGap: 20,
  trendRisk: 15,
  uncertainty: 20,
  momentum: 75,
  estimatedMinutes: 30,
};

const benchmarkScenarios: EvaluationScenario[] = [
  {
    id: "prerequisite-gap-wins-over-strong-topic",
    topicId: "algebra",
    candidates: [algebraCandidate, physicsCandidate],
    events: [
      { type: "question_answered", topicId: "algebra", correct: false, difficulty: 70, confidence: 80, responseSeconds: 90, observedAt: "2026-08-20T10:00:00.000Z" },
      { type: "question_answered", topicId: "algebra", correct: false, difficulty: 75, confidence: 70, responseSeconds: 100, observedAt: "2026-08-20T10:05:00.000Z" },
      { type: "question_answered", topicId: "algebra", correct: true, difficulty: 80, confidence: 65, responseSeconds: 70, observedAt: "2026-08-20T10:10:00.000Z" },
    ],
  },
  {
    id: "evidence-reduces-uncertainty",
    topicId: "physics",
    candidates: [physicsCandidate],
    events: [
      { type: "question_answered", topicId: "physics", correct: true, difficulty: 70, confidence: 80, responseSeconds: 50, observedAt: "2026-08-20T11:00:00.000Z" },
      { type: "practice_completed", topicId: "physics", correct: true, difficulty: 75, confidence: 85, responseSeconds: 45, observedAt: "2026-08-20T11:10:00.000Z" },
      { type: "exam_question", topicId: "physics", correct: true, difficulty: 85, confidence: 82, responseSeconds: 55, observedAt: "2026-08-20T11:20:00.000Z" },
    ],
  },
];

describe("Cortex real-behavior evaluation", () => {
  it("uses the existing learning utility to prioritize a genuine prerequisite gap", () => {
    const result = runEvaluationScenario(benchmarkScenarios[0]);

    expect(result.decision?.candidate.id).toBe("algebra-revision");
    expect(result.decision?.breakdown.masteryGap).toBe(75);
    expect(result.finalMastery).toBeGreaterThan(0);
    expect(result.finalUncertainty).toBeLessThan(80);
  });

  it("replays observable learning events through the real learning-state reducer", () => {
    const result = runEvaluationScenario(benchmarkScenarios[1]);

    expect(result.decision?.candidate.id).toBe("physics-review");
    expect(result.finalMastery).toBeGreaterThan(50);
    expect(result.finalUncertainty).toBeLessThan(80);
  });

  it("produces identical results when the same benchmark suite is replayed", () => {
    const first = runEvaluationSuite(benchmarkScenarios);
    const second = runEvaluationSuite(benchmarkScenarios);

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
  });
});
