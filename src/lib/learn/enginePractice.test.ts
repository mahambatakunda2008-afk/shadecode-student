import { describe, expect, it } from "vitest";
import { checkPracticeAnswer, newPracticeQuestion } from "./enginePractice";

describe("engine practice", () => {
  it("rebuilds the identical question from the seed", () => {
    const a = newPracticeQuestion("Physics", "Kinematics", 42)!;
    expect(a).toEqual(newPracticeQuestion("Physics", "Kinematics", 42));
    expect(a.question).not.toMatch(/[\\$]/);
    expect(newPracticeQuestion("Physics", "Kinematics", 43)?.question).not.toBe(a.question);
  });

  it("marks the answer for that seed exactly and shows the working afterwards", () => {
    const seed = 7;
    const first = checkPracticeAnswer("Chemistry", "The mole and Mr", seed, "")!;
    expect(first.correct).toBe(false);
    const right = checkPracticeAnswer("Chemistry", "The mole and Mr", seed, `It is ${first.answer.split(" ")[0]}`)!;
    expect(right.correct).toBe(true);
    expect(right.working.length).toBeGreaterThan(0);
    expect(checkPracticeAnswer("Chemistry", "The mole and Mr", seed, "123456.789")!.correct).toBe(false);
  });

  it("returns null for uncovered topics and invalid seeds", () => {
    expect(newPracticeQuestion("Physics", "Magnetism", 1)).toBeNull();
    expect(newPracticeQuestion("Biology", "Cells", 1)).toBeNull();
    expect(newPracticeQuestion("Physics", "Kinematics", -5)).toBeNull();
    expect(newPracticeQuestion("Physics", "Kinematics", 1.5)).toBeNull();
    expect(checkPracticeAnswer("Physics", "Kinematics", "abc", "5")).toBeNull();
  });
});
