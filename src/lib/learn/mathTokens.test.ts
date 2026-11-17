import { describe, expect, it } from "vitest";
import { classifyMathToken } from "./mathTokens";

describe("classifyMathToken", () => {
  it("treats single-dollar spans as inline and strips exactly one character per side", () => {
    expect(classifyMathToken("$116^\\circ$")).toEqual({ kind: "inline", expression: "116^\\circ" });
    expect(classifyMathToken("$O$")).toEqual({ kind: "inline", expression: "O" });
    expect(classifyMathToken("$F=ma$")).toEqual({ kind: "inline", expression: "F=ma" });
    expect(classifyMathToken("$PT = 12\\text{ cm}$")?.expression).toBe("PT = 12\\text{ cm}");
  });
  it("treats double-dollar, \\[ \\] and environments as display math", () => {
    expect(classifyMathToken("$$x^2+1$$")).toEqual({ kind: "display", expression: "x^2+1" });
    expect(classifyMathToken("\\[a+b\\]")).toEqual({ kind: "display", expression: "a+b" });
    const env = "\\begin{aligned}a&=b\\end{aligned}";
    expect(classifyMathToken(env)).toEqual({ kind: "display", expression: env });
  });
  it("treats \\( \\) as inline", () => {
    expect(classifyMathToken("\\(x+1\\)")).toEqual({ kind: "inline", expression: "x+1" });
  });
  it("returns null for ordinary text and degenerate tokens", () => {
    expect(classifyMathToken("plain words")).toBeNull();
    expect(classifyMathToken("$")).toBeNull();
    expect(classifyMathToken("$$")).toBeNull();
    expect(classifyMathToken("")).toBeNull();
  });
});
