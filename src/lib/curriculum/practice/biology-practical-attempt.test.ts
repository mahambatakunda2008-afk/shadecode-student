import { describe, expect, it } from "vitest";
import {
  canAttemptPracticalSet,
  ratePracticalSkill,
  revealPracticalGuidance,
  savePracticalAnswer,
  selfAwardPracticalMarks,
  startPracticalAttempt,
  summarizePracticalAttempt,
  type PracticalPracticeSet,
} from "./biology-practical-attempt";

const set: PracticalPracticeSet = {
  id: "biology-practical-preview",
  status: "draft",
  publicationStatus: "unpublished",
  tasks: [
    {
      id: "P3-01",
      title: "Catalase",
      paper: "Paper 3",
      skills: ["variables", "repeats", "graph"],
      questions: [
        { id: "a", marks: 3, prompt: "Identify variables.", answer: ["Independent variable", "Dependent variable"] },
        { id: "b", marks: 2, prompt: "Explain repeats.", answer: ["Repeat at least three times"] },
      ],
    },
  ],
};

describe("Biology practical attempt preview", () => {
  it("only allows explicitly draft and unpublished sets", () => {
    expect(canAttemptPracticalSet(set)).toBe(true);
    expect(canAttemptPracticalSet({ ...set, status: "published" })).toBe(false);
    expect(canAttemptPracticalSet({ ...set, publicationStatus: "published" })).toBe(false);
  });

  it("records answers and reveals guidance only when requested", () => {
    const initial = startPracticalAttempt(set, "2026-11-03T00:00:00.000Z");
    const answered = savePracticalAnswer(set, initial, "P3-01", "a", "Temperature; oxygen volume.");
    expect(answered.revealedAnswers).toEqual([]);
    const revealed = revealPracticalGuidance(set, answered, "P3-01", "a");
    expect(revealed.revealedAnswers).toEqual(["P3-01::a"]);
    expect(revealed.answers["P3-01::a"]).toBe("Temperature; oxygen volume.");
  });

  it("tracks self-assessment by task skill and highlights gaps", () => {
    let attempt = startPracticalAttempt(set);
    attempt = ratePracticalSkill(set, attempt, "P3-01", "variables", "secure");
    attempt = ratePracticalSkill(set, attempt, "P3-01", "repeats", "revisit");
    const summary = summarizePracticalAttempt(set, attempt);
    expect(summary.skillsToRevisit).toEqual(["repeats", "graph"]);
    expect(summary.skills.find((skill) => skill.skill === "variables")?.rating).toBe("secure");
  });

  it("bounds self-awarded marks and calculates transparent totals", () => {
    let attempt = startPracticalAttempt(set);
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "a", 2);
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "b", 1);
    const summary = summarizePracticalAttempt(set, attempt);
    expect(summary.selfAwardedMarks).toBe(3);
    expect(summary.availableMarks).toBe(5);
    expect(() => selfAwardPracticalMarks(set, attempt, "P3-01", "a", 4)).toThrow();
  });

  it("rejects unknown questions and skills", () => {
    const attempt = startPracticalAttempt(set);
    expect(() => savePracticalAnswer(set, attempt, "P3-01", "missing", "x")).toThrow();
    expect(() => ratePracticalSkill(set, attempt, "P3-01", "microscopy", "secure")).toThrow();
  });
});
