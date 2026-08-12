import { describe, expect, it } from "vitest";
import { CompactLocalModel } from "../compactLocalModel";

describe("CompactLocalModel benchmark contract", () => {
  const model = new CompactLocalModel();

  const cases = [
    ["What is acceleration?", "definition"],
    ["Define photosynthesis.", "definition"],
    ["Explain why increasing resistance changes current in a circuit.", "explanation"],
    ["Compare scalar and vector quantities.", "comparison"],
    ["Analyze the relationship between force and acceleration.", "analysis"],
    ["Give me a quick study tip.", "generic"],
  ] as const;

  it.each(cases)("classifies %s as %s", (question, expectedIntent) => {
    const result = model.infer(question);
    expect(result.intent).toBe(expectedIntent);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("is deterministic for repeated inputs", () => {
    const question = "What is acceleration?";
    expect(model.infer(question)).toEqual(model.infer(question));
  });

  it("does not mutate the input string", () => {
    const question = "  What is acceleration?  ";
    const before = question;
    model.infer(question);
    expect(question).toBe(before);
  });
});
