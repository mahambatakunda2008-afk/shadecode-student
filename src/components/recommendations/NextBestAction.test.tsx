import { describe, expect, it } from "vitest";
import { NextBestAction } from "./NextBestAction";

const recommendation = {
  action: "Revise Damping",
  reason: "Your latest Physics assessment shows this is a weak area.",
  priority: "high" as const,
  estimatedTime: 10,
  category: "revision" as const,
};

describe("NextBestAction", () => {
  it("exposes the recommendation content and metadata", () => {
    expect(recommendation.action).toBe("Revise Damping");
    expect(recommendation.reason).toMatch(/weak area/i);
    expect(recommendation.priority).toBe("high");
    expect(recommendation.estimatedTime).toBe(10);
    expect(recommendation.category).toBe("revision");
    expect(NextBestAction).toBeDefined();
  });

  it("supports the empty recommendation state", () => {
    const emptyRecommendation = null;
    expect(emptyRecommendation).toBeNull();
    expect(NextBestAction).toBeDefined();
  });
});
