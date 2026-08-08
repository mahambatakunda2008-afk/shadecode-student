import { describe, it, expect } from "vitest";
import { blendMastery } from "../blend";

describe("blendMastery", () => {
  it("initializes a topic with no prior history to the raw attempt score", () => {
    const result = blendMastery(null, 80);
    expect(result.mastery_score).toBe(80);
    expect(result.last_score).toBe(80);
    expect(result.attempts).toBe(1);
    expect(result.trend).toBe(0);
  });

  it("blends a new attempt as 30% weight against 70% history", () => {
    const result = blendMastery({ mastery_score: 50, attempts: 3 }, 100);
    // 50*0.7 + 100*0.3 = 65
    expect(result.mastery_score).toBe(65);
    expect(result.last_score).toBe(100);
    expect(result.attempts).toBe(4);
  });

  it("computes trend as the delta this attempt caused", () => {
    const improving = blendMastery({ mastery_score: 40, attempts: 2 }, 90);
    expect(improving.trend).toBeGreaterThan(0);

    const declining = blendMastery({ mastery_score: 90, attempts: 2 }, 20);
    expect(declining.trend).toBeLessThan(0);
  });

  it("a single bad exam doesn't erase established mastery", () => {
    const result = blendMastery({ mastery_score: 95, attempts: 10 }, 0);
    // 95*0.7 + 0*0.3 = 66.5 -> 67 (rounds), still well above zero
    expect(result.mastery_score).toBeGreaterThan(50);
  });

  it("a single lucky guess doesn't inflate a weak topic to full mastery", () => {
    const result = blendMastery({ mastery_score: 10, attempts: 10 }, 100);
    // 10*0.7 + 100*0.3 = 37
    expect(result.mastery_score).toBeLessThan(50);
  });

  it("clamps an out-of-range new attempt percentage into [0, 100]", () => {
    const tooHigh = blendMastery(null, 500);
    expect(tooHigh.mastery_score).toBe(100);

    const negative = blendMastery(null, -50);
    expect(negative.mastery_score).toBe(0);
  });

  it("increments attempts monotonically", () => {
    let state: { mastery_score: number; attempts: number } | null = null;
    for (let i = 0; i < 5; i++) {
      state = blendMastery(state, 70);
    }
    expect(state!.attempts).toBe(5);
  });
});
