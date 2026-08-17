import { describe, expect, it } from "vitest";
import { suggestQuestionTopic } from "./question-mapping";

describe("suggestQuestionTopic", () => {
  const candidates = [
    { id: "motion", name: "Motion", keywords: ["velocity", "acceleration", "displacement"] },
    { id: "waves", name: "Waves", keywords: ["frequency", "wavelength"] },
  ];

  it("returns an explainable candidate when lexical evidence is strong", () => {
    const result = suggestQuestionTopic("Calculate the acceleration from velocity and displacement.", candidates);
    expect(result?.topicId).toBe("motion");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.55);
    expect(result?.evidence).toContain("acceleration");
  });

  it("does not invent a mapping when evidence is weak", () => {
    expect(suggestQuestionTopic("Explain the experiment.", candidates)).toBeNull();
  });

  it("never mutates the candidate data", () => {
    const before = JSON.stringify(candidates);
    suggestQuestionTopic("Find the frequency of the wave.", candidates);
    expect(JSON.stringify(candidates)).toBe(before);
  });
});
