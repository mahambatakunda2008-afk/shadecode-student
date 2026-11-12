import { describe, expect, it } from "vitest";
import { resolveExamLearningContext } from "./learningContext";

describe("resolveExamLearningContext", () => {
  it("uses the subject and topic selected inside the exam room", () => {
    expect(resolveExamLearningContext(
      { subject: "  Physics ", topic: " Waves " },
      { subject: "", topic: "General" },
    )).toEqual({ subject: "Physics", topic: "Waves" });
  });

  it("falls back to route context when the result has no selection", () => {
    expect(resolveExamLearningContext(
      {},
      { subject: "Mathematics", topic: "Calculus" },
    )).toEqual({ subject: "Mathematics", topic: "Calculus" });
  });

  it("omits empty context instead of inventing a subject", () => {
    expect(resolveExamLearningContext({ subject: " " }, {})).toEqual({});
  });
});
