import { describe, expect, it } from "vitest";
import { ALL_GENERATORS, buildEngineExam, levelForDifficulty, matchGenerators } from "./index";
import { mathsJuniorGenerators } from "./generators/mathsJunior";
import { createRng } from "./rng";

const A_LEVEL_TOPICS = ["Differentiation", "Integration", "Binomial expansion and counting", "Logarithms and exponentials", "Sequences and series"];

describe("level-aware matching", () => {
  it("maps the exam setup's difficulty to a stage", () => {
    expect(levelForDifficulty("easy")).toBe("olevel");
    expect(levelForDifficulty("medium")).toBe("alevel");
    expect(levelForDifficulty("hard")).toBe("alevel");
    expect(levelForDifficulty(undefined)).toBeNull();
  });

  it("never gives O-Level (Forms 1-4) a broad paper containing A-Level content", () => {
    const pool = matchGenerators("Mathematics", "", "easy");
    expect(pool.some((g) => g.level === "alevel")).toBe(false);
    expect(pool.length).toBeGreaterThanOrEqual(mathsJuniorGenerators.length);
    for (let seed = 1; seed <= 30; seed++) {
      const exam = buildEngineExam({ subject: "Mathematics", topic: "", difficulty: "easy", count: 20, seed })!;
      for (const topic of exam.topics) expect(A_LEVEL_TOPICS, `seed ${seed} leaked ${topic}`).not.toContain(topic);
    }
  });

  it("never gives A-Level a broad paper of Form 1 arithmetic", () => {
    const pool = matchGenerators("Mathematics", "", "medium");
    expect(pool.some((g) => g.level === "olevel")).toBe(false);
    expect(pool.some((g) => g.level === "alevel")).toBe(true);
  });

  it("still honours an explicitly requested topic from the other stage", () => {
    expect(matchGenerators("Mathematics", "calculus", "easy").map((g) => g.id)).toContain("maths.differentiate-at-point");
    expect(matchGenerators("Mathematics", "percentages", "medium").map((g) => g.id)).toContain("maths.jr.percentage-of");
  });

  it("prefers stage-appropriate generators when a topic spans both", () => {
    const equationsOLevel = matchGenerators("Mathematics", "equations", "easy").map((g) => g.id);
    expect(equationsOLevel).toContain("maths.jr.linear-equation");
    expect(equationsOLevel).not.toContain("maths.discriminant");
    const sequencesOLevel = matchGenerators("Mathematics", "sequences", "easy").map((g) => g.id);
    expect(sequencesOLevel).toEqual(["maths.jr.nth-term"]);
  });

  it("keeps old behaviour for callers that pass no stage (re-marking)", () => {
    expect(matchGenerators("Mathematics", "").length).toBe(ALL_GENERATORS.filter((g) => g.subject === "Mathematics").length);
    expect(matchGenerators("Mathematics", "calculus").length).toBeGreaterThan(0);
  });

  it("leaves other subjects untouched", () => {
    expect(matchGenerators("Physics", "kinematics", "easy").length).toBeGreaterThan(0);
    expect(matchGenerators("Chemistry", "mole", "medium").length).toBeGreaterThan(0);
  });
});

describe("Form 1-4 Maths questions", () => {
  it("covers a real spread of O-Level topics", () => {
    const topics = new Set(mathsJuniorGenerators.map((g) => g.topic));
    expect(topics.size).toBeGreaterThanOrEqual(12);
    expect(mathsJuniorGenerators.every((g) => g.level === "olevel" && g.subject === "Mathematics")).toBe(true);
  });

  it("uses balanced maths delimiters and never a currency dollar sign", () => {
    for (const generator of mathsJuniorGenerators) {
      for (let seed = 1; seed <= 60; seed++) {
        const item = generator.build(createRng(seed * 7919));
        const dollars = (item.question.match(/\$/g) ?? []).length;
        expect(dollars % 2, `${generator.id}: ${item.question}`).toBe(0);
        expect(item.question, generator.id).not.toMatch(/\$\d+(\.\d+)?(?![^$]*\$)/);
      }
    }
  });

  it("builds varied questions rather than repeating one", () => {
    for (const generator of mathsJuniorGenerators) {
      const texts = new Set(Array.from({ length: 40 }, (_, i) => generator.build(createRng(i * 104729 + 3)).question));
      expect(texts.size, generator.id).toBeGreaterThan(4);
    }
  });
});
