import { describe, expect, it } from "vitest";
import { parseShade, runShade } from "./index";

describe("Shade language core", () => {
  it("parses and executes basic values", () => {
    const result = runShade('name = "Shade"\nshow "Hello " + name');
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["Hello Shade"]);
  });

  it("executes selection and iteration", () => {
    const result = runShade("total = 0\nfor value in [1, 2, 3]\n    total = total + value\nshow total\nif total == 6\n    show \"passed\"\nelse\n    show \"failed\"");
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["6", "passed"]);
  });

  it("supports functions and built-in collection helpers", () => {
    const result = runShade("function average(values)\n    return sum(values) / length(values)\nshow average([10, 20, 30])");
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["20"]);
  });

  it("rejects unknown characters before execution", () => {
    const result = parseShade("value = 10 @ 2");
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Unexpected character"))).toBe(true);
  });

  it("stops runaway loops", () => {
    const result = runShade("x = 1\nwhile x > 0\n    show x", { maxSteps: 100 });
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("limit exceeded"))).toBe(true);
  });
});
