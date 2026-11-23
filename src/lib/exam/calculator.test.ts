import { describe, expect, it } from "vitest";
import { definiteIntegral, derivative, descriptiveStatistics, evaluateExpression, solveByBisection } from "./calculator";
import { differentiatePolynomial, integratePolynomial, simplifyPolynomial } from "./symbolic";

describe("offline scientific calculator", () => {
  it("evaluates scientific functions, constants and implicit multiplication", () => {
    expect(evaluateExpression("sin(30)^2 + cos(30)^2", {}, "DEG")).toBeCloseTo(1, 12);
    expect(evaluateExpression("2pi")).toBeCloseTo(2 * Math.PI, 12);
    expect(evaluateExpression("ln(e)")).toBeCloseTo(1, 12);
    expect(evaluateExpression("5!")).toBe(120);
    expect(evaluateExpression("sqrt(81) + log(100)")).toBe(11);
  });

  it("supports variable expressions", () => {
    expect(evaluateExpression("x^2 + 2x + 1", { x: 3 })).toBe(16);
  });

  it("approximates derivatives and definite integrals", () => {
    expect(derivative("x^3", 2)).toBeCloseTo(12, 5);
    expect(definiteIntegral("x^2", 0, 3)).toBeCloseTo(9, 8);
  });

  it("finds bracketed roots", () => {
    expect(solveByBisection("x^2 - 4", 0, 3)).toBeCloseTo(2, 8);
  });

  it("calculates descriptive statistics", () => {
    const stats = descriptiveStatistics([4, 7, 7, 9, 13]);
    expect(stats.mean).toBe(8);
    expect(stats.median).toBe(7);
    expect(stats.standardDeviation).toBeCloseTo(Math.sqrt(8.8), 10);
  });

  it("rejects executable or unknown input", () => {
    expect(() => evaluateExpression("window.alert(1)")).toThrow();
    expect(() => evaluateExpression("unknown + 1")).toThrow();
  });

  it("simplifies, differentiates and integrates polynomial expressions symbolically", () => {
    expect(simplifyPolynomial("2(x + 3)^2 - x^2")).toBe("x^2 + 12x + 18");
    expect(differentiatePolynomial("3x^3 - 4x^2 + 7x - 9")).toBe("9x^2 - 8x + 7");
    expect(integratePolynomial("6x^2 + 4x")).toBe("2x^3 + 2x^2 + C");
  });

  it("rejects unsupported non-polynomial operations", () => {
    expect(() => simplifyPolynomial("sin(x)")).toThrow();
    expect(() => simplifyPolynomial("x / (x + 1)")).toThrow();
  });
});
