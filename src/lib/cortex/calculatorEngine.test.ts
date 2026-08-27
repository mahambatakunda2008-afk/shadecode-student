import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./calculatorEngine";

describe("calculatorEngine", () => {
  it("respects operator precedence", () => expect(evaluateExpression("2 + 3 * 4")).toMatchObject({ ok: true, value: 14 }));
  it("supports parentheses and unary signs", () => expect(evaluateExpression("-(2 + 3) * 4")).toMatchObject({ ok: true, value: -20 }));
  it("supports modulo", () => expect(evaluateExpression("17 % 5")).toMatchObject({ ok: true, value: 2 }));
  it("rejects division by zero", () => expect(evaluateExpression("10 / 0")).toMatchObject({ ok: false, error: "division_by_zero" }));
  it("rejects invalid syntax", () => expect(evaluateExpression("2 + bad")).toMatchObject({ ok: false, error: "invalid_expression" }));
  it("does not execute arbitrary code", () => expect(evaluateExpression("constructor")).toMatchObject({ ok: false, error: "invalid_expression" }));
  it("handles decimals", () => expect(evaluateExpression("0.5 * 8")).toMatchObject({ ok: true, value: 4 }));
});
