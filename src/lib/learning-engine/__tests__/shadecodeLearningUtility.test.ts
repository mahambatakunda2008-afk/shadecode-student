import { describe, expect, it } from "vitest";
import {
  calculateLearningUtility,
  chooseNextLearningMove,
  type LearningCandidate,
} from "../shadecodeLearningUtility";

const baseCandidate: LearningCandidate = {
  id: "algebra-1",
  type: "revision",
  mastery: 50,
  retentionRisk: 40,
  examUrgency: 30,
  prerequisiteValue: 50,
  goalAlignment: 50,
  curriculumGap: 50,
  trendRisk: 30,
  uncertainty: 20,
  momentum: 50,
  estimatedMinutes: 30,
};

describe("Shadecode Learning Utility", () => {
  it("returns a bounded, deterministic score", () => {
    const first = calculateLearningUtility(baseCandidate);
    const second = calculateLearningUtility(baseCandidate);

    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first).toEqual(second);
  });

  it("raises utility when mastery gap and retention risk increase", () => {
    const weak = calculateLearningUtility({
      ...baseCandidate,
      mastery: 20,
      retentionRisk: 90,
    });
    const strong = calculateLearningUtility({
      ...baseCandidate,
      mastery: 85,
      retentionRisk: 10,
    });

    expect(weak.score).toBeGreaterThan(strong.score);
    expect(weak.breakdown.need).toBeGreaterThan(strong.breakdown.need);
  });

  it("raises utility for urgent exam preparation", () => {
    const urgent = calculateLearningUtility({ ...baseCandidate, examUrgency: 100 });
    const relaxed = calculateLearningUtility({ ...baseCandidate, examUrgency: 0 });

    expect(urgent.score).toBeGreaterThan(relaxed.score);
  });

  it("does not let a long task win solely because its raw need is high", () => {
    const shortIntervention = calculateLearningUtility({
      ...baseCandidate,
      mastery: 35,
      retentionRisk: 70,
      estimatedMinutes: 15,
    });
    const veryLongTask = calculateLearningUtility({
      ...baseCandidate,
      mastery: 30,
      retentionRisk: 75,
      estimatedMinutes: 180,
    });

    expect(shortIntervention.breakdown.costPenalty).toBeLessThan(veryLongTask.breakdown.costPenalty);
    expect(shortIntervention.score).toBeGreaterThan(veryLongTask.score);
  });

  it("uses uncertainty as a bounded exploration bonus", () => {
    const uncertain = calculateLearningUtility({ ...baseCandidate, uncertainty: 100 });
    const certain = calculateLearningUtility({ ...baseCandidate, uncertainty: 0 });

    expect(uncertain.breakdown.explorationBonus).toBeGreaterThan(certain.breakdown.explorationBonus);
    expect(uncertain.breakdown.explorationBonus).toBeLessThanOrEqual(8);
  });

  it("chooses the highest-utility move", () => {
    const result = chooseNextLearningMove([
      { ...baseCandidate, id: "easy", mastery: 90, retentionRisk: 10 },
      { ...baseCandidate, id: "urgent-weak", mastery: 25, retentionRisk: 85, examUrgency: 90 },
      { ...baseCandidate, id: "average", mastery: 60, retentionRisk: 30 },
    ]);

    expect(result?.candidate.id).toBe("urgent-weak");
  });

  it("returns null for an empty candidate set", () => {
    expect(chooseNextLearningMove([])).toBeNull();
  });

  it("produces an explainable decision reason", () => {
    const result = calculateLearningUtility({
      ...baseCandidate,
      mastery: 20,
      retentionRisk: 90,
      examUrgency: 80,
    });

    expect(result.reason).toMatch(/mastery gap|retention risk|approaching assessment/i);
    expect(result.reason).toContain("utility=");
  });
});
