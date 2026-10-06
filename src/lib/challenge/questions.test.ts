import { describe, expect, it } from "vitest";
import { sanitizeQuestions } from "./questions";

const mcq = { id: 1, type: "multiple_choice", question: "2+2?", options: ["3", "4"], marks: 1, topic: "Arithmetic", modelAnswer: "4", extra: "dropped" };
const short = { id: 2, type: "short_answer", question: "Define velocity.", marks: 2, topic: "Kinematics" };

describe("sanitizeQuestions", () => {
  it("keeps valid questions and drops unknown fields", () => {
    const result = sanitizeQuestions([mcq, short]);
    expect(result).toHaveLength(2);
    expect(result?.[0]).not.toHaveProperty("extra");
    expect(result?.[0].modelAnswer).toBe("4");
  });
  it("rejects empty, oversized, or non-array input", () => {
    expect(sanitizeQuestions([])).toBeNull();
    expect(sanitizeQuestions("x")).toBeNull();
    expect(sanitizeQuestions(Array.from({ length: 21 }, (_, i) => ({ ...short, id: i + 1 })))).toBeNull();
  });
  it("rejects malformed items, duplicate ids and multiple choice without options", () => {
    expect(sanitizeQuestions([{ ...short, marks: 0 }])).toBeNull();
    expect(sanitizeQuestions([{ ...short, type: "essay2" }])).toBeNull();
    expect(sanitizeQuestions([short, { ...short }])).toBeNull();
    expect(sanitizeQuestions([{ ...mcq, options: ["only one"] }])).toBeNull();
  });
  it("caps long strings", () => {
    expect(sanitizeQuestions([{ ...short, question: "x".repeat(9000) }])?.[0].question).toHaveLength(4000);
  });
});
