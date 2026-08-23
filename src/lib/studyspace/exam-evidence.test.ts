import { describe, expect, it } from "vitest";
import { evidenceFromExamResult } from "./exam-evidence";

describe("exam evidence", () => {
  it("turns a strong exam into mastered evidence", () => {
    const evidence = evidenceFromExamResult({
      totalScore: 9,
      maxScore: 10,
      percentage: 90,
      grade: "A*",
      weakAreas: [],
      strongAreas: ["Mechanics"],
      cortexInsight: "Strong",
      results: [],
      timeTaken: 600,
    }, "Physics", "Mechanics", "exam:test");

    expect(evidence.source).toBe("exam");
    expect(evidence.outcome).toBe("mastered");
    expect(evidence.percentage).toBe(90);
    expect(evidence.strongAreas).toEqual(["Mechanics"]);
  });

  it("preserves weak areas and subject boundaries", () => {
    const evidence = evidenceFromExamResult({
      totalScore: 4,
      maxScore: 10,
      percentage: 40,
      grade: "E",
      weakAreas: ["Integration"],
      strongAreas: ["Algebra"],
      cortexInsight: "Needs work",
      results: [],
      timeTaken: 300,
    }, "Mathematics", "Calculus", "exam:test");

    expect(evidence.outcome).toBe("struggled");
    expect(evidence.subject).toBe("Mathematics");
    expect(evidence.weakAreas).toEqual(["Integration"]);
  });
});
