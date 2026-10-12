import { describe, expect, it } from "vitest";
import { checkPracticeAnswer, newPracticeQuestion } from "./enginePractice";

describe("engine practice", () => {
  it("rebuilds the identical question from the seed and generator", () => {
    const a = newPracticeQuestion("Physics", "Kinematics", 42)!;
    expect(a).toEqual(newPracticeQuestion("Physics", "Kinematics", 42));
    expect(a.question).not.toMatch(/[\\$]/);
    expect(a.generator).toMatch(/^physics\./);
  });

  it("marks the answer for that seed exactly and shows the working afterwards", () => {
    const q = newPracticeQuestion("Chemistry", "The mole and Mr", 7)!;
    const first = checkPracticeAnswer("Chemistry", "The mole and Mr", q.seed, q.generator, "")!;
    expect(first.correct).toBe(false);
    const right = checkPracticeAnswer("Chemistry", "The mole and Mr", q.seed, q.generator, `It is ${first.answer.split(" ")[0]}`)!;
    expect(right.correct).toBe(true);
    expect(right.working.length).toBeGreaterThan(0);
    expect(right.hint).toBeUndefined();
    expect(checkPracticeAnswer("Chemistry", "The mole and Mr", q.seed, q.generator, "123456.789")!.correct).toBe(false);
  });

  it("diagnoses a classic mistake with a kind hint and the mistake id", () => {
    let diagnosed = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const q = newPracticeQuestion("Physics", "Kinematics", seed * 977)!;
      const exact = checkPracticeAnswer("Physics", "Kinematics", q.seed, q.generator, "")!;
      expect(exact.correct).toBe(false);
      // suvat-v: forgetting u gives a*t; recover it from the question text.
      const numbers = q.question.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      if (q.generator === "physics.suvat-v") {
        const [u, a, t] = numbers;
        const result = checkPracticeAnswer("Physics", "Kinematics", q.seed, q.generator, String(a * t))!;
        if (u > 0) {
          expect(result.mistakeId).toBe("forgot-initial-speed");
          expect(result.hint).toContain("initial speed");
          diagnosed += 1;
        }
      }
    }
    expect(diagnosed).toBeGreaterThan(0);
  });

  it("learns: weights steer which question type is chosen, yet the check still rebuilds it", () => {
    const heavy = { "physics.suvat-s": 1000 };
    const chosen = Array.from({ length: 20 }, (_, i) => newPracticeQuestion("Physics", "Kinematics", i + 1, heavy)!);
    expect(chosen.every((q) => q.generator === "physics.suvat-s")).toBe(true);
    const unweighted = newPracticeQuestion("Physics", "Kinematics", 5)!;
    expect(checkPracticeAnswer("Physics", "Kinematics", chosen[0].seed, chosen[0].generator, "")).not.toBeNull();
    expect(unweighted.generator).toMatch(/^physics\.suvat/);
  });

  it("returns null for uncovered topics, invalid seeds and a generator from another topic", () => {
    expect(newPracticeQuestion("Physics", "Magnetism", 1)).toBeNull();
    expect(newPracticeQuestion("Biology", "Cells", 1)).toBeNull();
    expect(newPracticeQuestion("Physics", "Kinematics", -5)).toBeNull();
    expect(checkPracticeAnswer("Physics", "Kinematics", "abc", "physics.suvat-v", "5")).toBeNull();
    expect(checkPracticeAnswer("Physics", "Kinematics", 1, "physics.half-life", "5")).toBeNull();
    expect(checkPracticeAnswer("Physics", "Kinematics", 1, 7, "5")).toBeNull();
  });
});
