import { describe, expect, it } from "vitest";
import { ALL_GENERATORS } from "@/lib/exam/engine";
import { buildEngineQuiz } from "@/lib/exam/engine/quiz";
import { buildEnginePracticeBlocks, hasEnginePractice } from "@/lib/cortex/enginePractice";
import { checkPracticeAnswer, newPracticeQuestion } from "./enginePractice";

const level = (id: string) => ALL_GENERATORS.find((generator) => generator.id === id)?.level;

describe("Learn practice respects the learner's level", () => {
  it("never gives an O-Level (Forms 1-4) learner an A-Level generator on a broad topic", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = newPracticeQuestion("Mathematics", "", seed, undefined, "easy")!;
      expect(q, `seed ${seed}`).not.toBeNull();
      expect(level(q.generator), `${q.generator} at seed ${seed}`).not.toBe("alevel");
    }
  });

  it("never gives an A-Level learner Form 1 arithmetic on a broad topic", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = newPracticeQuestion("Mathematics", "", seed, undefined, "medium")!;
      expect(level(q.generator), `${q.generator} at seed ${seed}`).not.toBe("olevel");
    }
  });

  it("keeps the old behaviour when the level is unknown", () => {
    const seen = new Set<string | undefined>();
    for (let seed = 1; seed <= 400; seed++) seen.add(level(newPracticeQuestion("Mathematics", "", seed)!.generator));
    expect(seen.has("alevel")).toBe(true);
    expect(seen.has("olevel")).toBe(true);
  });

  it("serves Form 1-4 topics to an O-Level learner and still honours an explicit A-Level topic", () => {
    expect(newPracticeQuestion("Mathematics", "Percentages", 5, undefined, "easy")!.generator).toMatch(/^maths\.jr\.percentage/);
    expect(newPracticeQuestion("Mathematics", "Differentiation", 5, undefined, "easy")!.generator).toBe("maths.differentiate-at-point");
  });

  it("marks a practice question the same whichever level it was chosen for", () => {
    const q = newPracticeQuestion("Mathematics", "Percentages", 11, undefined, "easy")!;
    const wrong = checkPracticeAnswer("Mathematics", "Percentages", q.seed, q.generator, "")!;
    expect(wrong.correct).toBe(false);
    const right = checkPracticeAnswer("Mathematics", "Percentages", q.seed, q.generator, wrong.answer.split(" ")[0])!;
    expect(right.correct).toBe(true);
  });
});

describe("guides and quizzes respect the learner's level", () => {
  it("builds worked examples for a Form 1-4 topic that has no A-Level generator", () => {
    expect(hasEnginePractice("Mathematics", "Percentages", "easy")).toBe(true);
    const guide = buildEnginePracticeBlocks("Mathematics", "Percentages", 3, "easy");
    expect(guide).not.toBeNull();
    expect(guide!.blocks.map((block) => block.content).join("\n")).toMatch(/%/);
  });

  it("builds a broad O-Level practice lesson without calculus", () => {
    const guide = buildEnginePracticeBlocks("Mathematics", "", 9, "easy");
    expect(guide).not.toBeNull();
    const text = guide!.blocks.map((block) => block.content).join("\n").toLowerCase();
    expect(text).not.toMatch(/differentiate|integral|\blog\b|binomial|geometric series/);
  });

  it("builds engine quizzes for both levels", () => {
    expect(buildEngineQuiz({ subject: "Mathematics", topic: "", difficulty: "easy", seed: 4 })).toHaveLength(5);
    expect(buildEngineQuiz({ subject: "Mathematics", topic: "", difficulty: "medium", seed: 4 })).toHaveLength(5);
    expect(buildEngineQuiz({ subject: "Mathematics", topic: "", seed: 4 })).toHaveLength(5);
  });
});
