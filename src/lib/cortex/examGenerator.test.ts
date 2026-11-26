import { describe, expect, it } from "vitest";
import { topicMatchesAny, questionDifficultyMatchesRequest, selectBalancedQuestions, type ExamQuestion } from "./examGenerator";

describe("topicMatchesAny", () => {
  it("accepts a question assigned to any one of the selected topics", () => {
    const topics = ["Kinematics", "Forces", "Momentum"];
    expect(topicMatchesAny(topics, "Forces", "Calculate the resultant force on the object.")).toBe(true);
    expect(topicMatchesAny(topics, "Momentum", "Determine the change in momentum.")).toBe(true);
  });

  it("rejects questions assigned to an unselected neighbouring topic", () => {
    expect(topicMatchesAny(["Kinematics", "Forces"], "Energy", "Calculate the gravitational potential energy.")).toBe(false);
  });

  it("uses the question text when the model omits its topic label", () => {
    expect(topicMatchesAny(["Kinematics", "Forces"], "", "Use kinematics to calculate acceleration from the change in velocity.")).toBe(true);
    expect(topicMatchesAny(["Kinematics", "Forces"], "", "Explain the structure of an ionic lattice.")).toBe(false);
  });

  it("keeps an empty topic selection unrestricted", () => {
    expect(topicMatchesAny([], "Organic chemistry", "Explain electrophilic addition.")).toBe(true);
  });

  it("preserves parent and child topic matching", () => {
    expect(topicMatchesAny(["Mechanics"], "Mechanics: Kinematics", "Calculate acceleration.")).toBe(true);
    expect(topicMatchesAny(["Kinematics: SUVAT"], "Kinematics", "Use SUVAT equations.")).toBe(true);
  });
});

describe("questionDifficultyMatchesRequest", () => {
  it("does not accept questions at a different requested difficulty", () => {
    expect(questionDifficultyMatchesRequest("hard", "hard")).toBe(true);
    expect(questionDifficultyMatchesRequest("easy", "hard")).toBe(false);
    expect(questionDifficultyMatchesRequest("medium", "easy")).toBe(false);
    expect(questionDifficultyMatchesRequest(undefined, "hard")).toBe(true);
  });
});

describe("selectBalancedQuestions", () => {
  const question = (id: string, topic: string): ExamQuestion => ({
    id, type: "structured", question: `Calculate and explain the result for the ${topic} scenario.`,
    marks: 4, topic, difficulty: "medium", modelAnswer: "A sufficiently detailed model answer.",
    markingCriteria: "Award marks for method and correct conclusion.",
  });

  it("balances candidates across selected topics before taking a second from one topic", () => {
    const candidates = [
      question("k1", "Kinematics"), question("k2", "Kinematics"),
      question("f1", "Forces"), question("f2", "Forces"),
      question("m1", "Momentum"),
    ];
    expect(selectBalancedQuestions(candidates, ["Kinematics", "Forces", "Momentum"], 4).map(q => q.id))
      .toEqual(["k1", "f1", "m1", "k2"]);
  });

  it("does not let a parent topic steal questions from an explicitly selected child topic", () => {
    const candidates = [
      question("kin1", "Kinematics"), question("kin2", "Kinematics"),
      question("forces1", "Forces"),
    ];
    expect(selectBalancedQuestions(candidates, ["Mechanics", "Kinematics", "Forces"], 3).map(q => q.id))
      .toEqual(["kin1", "forces1", "kin2"]);
  });

  it("does not invent questions when a selected topic has no valid candidates", () => {
    const candidates = [question("k1", "Kinematics"), question("f1", "Forces")];
    expect(selectBalancedQuestions(candidates, ["Kinematics", "Forces", "Momentum"], 5).map(q => q.id))
      .toEqual(["k1", "f1"]);
  });

  it("keeps original order for a single topic or full-syllabus selection", () => {
    const candidates = [question("a", "Kinematics"), question("b", "Forces")];
    expect(selectBalancedQuestions(candidates, ["Mechanics"], 2).map(q => q.id)).toEqual(["a", "b"]);
    expect(selectBalancedQuestions(candidates, [], 1).map(q => q.id)).toEqual(["a"]);
  });
});
