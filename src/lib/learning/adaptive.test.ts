import { describe, expect, it } from "vitest";
import { buildEngineExam, matchGenerators, weightedOrder } from "@/lib/exam/engine";
import { createRng } from "@/lib/exam/engine/rng";
import { generatorWeights } from "./adaptive";

const rows = (key: string, results: boolean[]) => results.map((correct) => ({ item_key: key, correct }));

describe("generatorWeights", () => {
  it("weights frequently-wrong question types higher and mastered ones lower", () => {
    const weights = generatorWeights([...rows("a", [false, false, false, true]), ...rows("b", [true, true, true, true, true, true]), ...rows("c", [true, false])]);
    expect(weights.a).toBeGreaterThan(weights.c);
    expect(weights.c).toBeGreaterThan(1);
    expect(weights.b).toBe(0.4);
  });
  it("smooths a single result and ignores unusable rows", () => {
    const weights = generatorWeights([{ item_key: "x", correct: false }, { item_key: null, correct: false }, { item_key: "y", correct: null }]);
    expect(weights.x).toBeGreaterThan(1);
    expect(weights.x).toBeLessThan(3);
    expect(Object.keys(weights)).toEqual(["x"]);
  });
});

describe("weightedOrder", () => {
  const generators = matchGenerators("Physics", "");
  it("returns every generator exactly once, deterministically", () => {
    const a = weightedOrder(generators, { "physics.suvat-v": 3 }, createRng(5)).map((g) => g.id);
    expect(a).toHaveLength(generators.length);
    expect(new Set(a).size).toBe(generators.length);
    expect(a).toEqual(weightedOrder(generators, { "physics.suvat-v": 3 }, createRng(5)).map((g) => g.id));
  });
  it("puts heavier generators first more often than lighter ones", () => {
    let heavyFirst = 0;
    let lightFirst = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const first = weightedOrder(generators, { "physics.suvat-v": 3, "physics.power": 0.1 }, createRng(seed * 31))[0].id;
      if (first === "physics.suvat-v") heavyFirst += 1;
      if (first === "physics.power") lightFirst += 1;
    }
    expect(heavyFirst).toBeGreaterThan(lightFirst * 8);
  });
  it("buildEngineExam honours weights and stays valid", () => {
    const exam = buildEngineExam({ subject: "Physics", topic: "", difficulty: "medium", count: 4, seed: 9, weights: { "physics.half-life": 50 } })!;
    expect(exam.questions[0].numeric?.generator).toBe("physics.half-life");
    expect(new Set(exam.questions.map((q) => q.question)).size).toBe(4);
  });
});
