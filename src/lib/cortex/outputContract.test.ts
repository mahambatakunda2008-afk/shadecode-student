import { describe, expect, it } from "vitest";
import { parseCortexJson, validateCortexObject } from "./outputContract";

describe("Cortex output contract", () => {
  it("parses fenced JSON and embedded objects", () => {
    expect(parseCortexJson('hello {"content":"A useful explanation."}')).toEqual({ content: "A useful explanation." });
    expect(parseCortexJson("```json\\n{\\"content\\":\\"A useful explanation.\\"}\\n```")).toEqual({ content: "A useful explanation." });
  });

  it("rejects empty and placeholder output", () => {
    expect(validateCortexObject(null).ok).toBe(false);
    expect(validateCortexObject({ content: "Please try again." }).ok).toBe(false);
  });

  it("accepts substantive structured output", () => {
    expect(validateCortexObject({ content: "Explain the concept step by step and connect it to the question." }).ok).toBe(true);
  });
});
