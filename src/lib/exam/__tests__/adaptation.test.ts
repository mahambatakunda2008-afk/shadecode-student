import { describe, expect, it } from "vitest";
import { buildExamAdaptation } from "../adaptation";

describe("buildExamAdaptation", () => {
  it("prioritises remediation for a weak result with a weak area", () => {
    const result = buildExamAdaptation({ percentage: 42, weakAreas: ["Mechanics"], subject: "Physics" });
    expect(result.action).toBe("remediate");
    expect(result.target).toBe("Mechanics");
    expect(result.priority).toBe("high");
  });

  it("targets practice when weaknesses remain but the result is not foundationally weak", () => {
    const result = buildExamAdaptation({ percentage: 68, weakAreas: ["Organic chemistry", "Equilibria"] });
    expect(result.action).toBe("practice");
    expect(result.target).toBe("Organic chemistry");
  });

  it("raises the challenge when performance is strong", () => {
    const result = buildExamAdaptation({ percentage: 92, strongAreas: ["Algorithms"] });
    expect(result.action).toBe("challenge");
    expect(result.target).toBe("Algorithms");
    expect(result.priority).toBe("low");
  });

  it("falls back to review for a solid result without explicit weak areas", () => {
    const result = buildExamAdaptation({ percentage: 76, subject: "Mathematics", topic: "Trigonometry" });
    expect(result.action).toBe("review");
    expect(result.target).toBe("Trigonometry");
  });
});
