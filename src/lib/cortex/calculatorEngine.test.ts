import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./calculatorEngine";

describe("calculatorEngine", () => {
  it("respects precedence", () => expect(evaluateExpression("2 + 3 * 4")).toMatchObject({ ok: true, value: 14 }));
  it("supports parentheses and unary signs", () => expect(evaluateExpression("-(2 + 3) * 4")).toMatchObject({ ok: true, value: -20 }));
  it("handles modulo and decimals", () => expect(evaluateExpression("17 % 5 + 0.5 * 8")).toMatchObject({ ok: true, value: 6 }));
  it("rejects division by zero", () => expect(evaluateExpression("10 / 0")).toMatchObject({ ok: false, error: "division_by_zero" }));
  it("rejects invalid input", () => expect(evaluateExpression("2 + bad")).toMatchObject({ ok: false, error: "invalid_expression" }));
});
