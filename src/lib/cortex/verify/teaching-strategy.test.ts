import { describe, expect, it } from "vitest";
import { formatVerifyTeachingStrategy, recommendVerifyTeachingStrategy } from "./teaching-strategy";

describe("recommendVerifyTeachingStrategy", () => {
  it("starts diagnostically when topic evidence is insufficient", () => {
    const result = recommendVerifyTeachingStrategy({ masteryScore: 30, attempts: 1 });
    expect(result.strategy).toBe("diagnostic-first");
    expect(result.confidence).toBe("low");
  });

  it("uses guided reconstruction for repeated verified errors", () => {
    const result = recommendVerifyTeachingStrategy({
      masteryScore: 72, attempts: 5, repeatedIncorrectResponses: 3,
    });
    expect(result.strategy).toBe("guided-reconstruction");
  });

  it("uses a worked example when mastery evidence is weak without repeated-error signal", () => {
    expect(recommendVerifyTeachingStrategy({
      masteryScore: 42, attempts: 3,
    }).strategy).toBe("worked-example");
  });

  it("uses retrieval and transfer when evidence is stronger", () => {
    expect(recommendVerifyTeachingStrategy({
      masteryScore: 78, attempts: 4,
    }).strategy).toBe("retrieval-and-transfer");
  });

  it("clamps malformed mastery and never claims a learned visual preference", () => {
    const result = recommendVerifyTeachingStrategy({ masteryScore: 140, attempts: 2 });
    expect(result.strategy).toBe("retrieval-and-transfer");
    expect(formatVerifyTeachingStrategy(result)).toContain("infer a visual-learning preference");
  });
});
