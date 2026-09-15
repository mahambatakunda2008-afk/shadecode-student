import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./expression-parser";

describe("pseudocode expression parser", () => {
  it("evaluates arithmetic without JavaScript evaluation", () => {
    expect(evaluateExpression("2 + 3 * 4", {})).toBe(14);
    expect(evaluateExpression("17 DIV 5", {})).toBe(3);
    expect(evaluateExpression("17 MOD 5", {})).toBe(2);
  });

  it("evaluates comparisons and boolean operators", () => {
    const vars = { A: 7, B: 3 };
    expect(evaluateExpression("A > B AND B < 5", vars)).toBe(true);
    expect(evaluateExpression("A = 7 OR B = 9", vars)).toBe(true);
    expect(evaluateExpression("NOT (A < B)", vars)).toBe(true);
  });

  it("supports strings, LENGTH and indexed arrays", () => {
    const vars = { Name: "Takunda", Values: [10, 20, 30] };
    expect(evaluateExpression("LENGTH(Name)", vars)).toBe(7);
    expect(evaluateExpression("Values[2] + 5", vars)).toBe(25);
    expect(evaluateExpression('Name + " Student"', vars)).toBe("Takunda Student");
  });

  it("rejects unsupported executable syntax", () => {
    expect(() => evaluateExpression("constructor.constructor(\"return 7\")()", {})).toThrow();
    expect(() => evaluateExpression("process.exit()", {})).toThrow();
  });

  it("rejects division by zero", () => {
    expect(() => evaluateExpression("10 / 0", {})).toThrow("Division by zero");
  });
});
