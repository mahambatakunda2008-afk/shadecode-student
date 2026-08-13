import { describe, expect, it } from "vitest";
import { completeIntervention, evaluateIntervention, startIntervention } from "../outcomeEngine";
import type { LearningDecision } from "@/lib/learning-engine/shadecodeLearningUtility";

const decision = {
  candidate: {
    id: "algebra",
    type: "revision",
    mastery: 30,
    retentionRisk: 80,
    examUrgency: 50,
    prerequisiteValue: 70,
    goalAlignment: 80,
    curriculumGap: 70,
    trendRisk: 60,
    uncertainty: 70,
    momentum: 40,
    estimatedMinutes: 15,
  },
  score: 82,
  breakdown: { masteryGap: 70, need: 75, opportunity: 70, costPenalty: 1.25, utility: 82, explorationBonus: 5.6 },
  reason: "test",
} satisfies LearningDecision;

describe("Cortex outcome engine", () => {
  it("starts an intervention from a decision", () => {
    const record = startIntervention(decision, "i1", "2026-08-10T20:00:00Z");
    expect(record.status).toBe("started");
    expect(record.topicId).toBe("algebra");
    expect(record.decisionScore).toBe(82);
  });

  it("records completion and follow-up performance", () => {
    const started = startIntervention(decision, "i1", "2026-08-10T20:00:00Z");
    const completed = completeIntervention(started, "2026-08-10T20:20:00Z", 20, 75);
    expect(completed.status).toBe("completed");
    expect(completed.minutesSpent).toBe(20);
    expect(completed.followUpScore).toBe(75);
  });

  it("rewards completion and useful follow-up improvement", () => {
    const started = startIntervention(decision, "i1", "2026-08-10T20:00:00Z");
    const completed = completeIntervention(started, "2026-08-10T20:15:00Z", 15, 80);
    const abandoned = { ...started, status: "abandoned" as const };

    const good = evaluateIntervention(completed, 60);
    const bad = evaluateIntervention(abandoned, 60);
    expect(good.outcomeScore).toBeGreaterThan(bad.outcomeScore);
    expect(good.followUpImprovement).toBeGreaterThan(0);
  });

  it("does not fabricate follow-up improvement without a baseline and follow-up", () => {
    const started = startIntervention(decision, "i1", "2026-08-10T20:00:00Z");
    expect(evaluateIntervention(started).followUpImprovement).toBe(0);
  });
});
