import { describe, expect, it } from "vitest";
import { lowerShadeToIR } from "./ir";
import { parseShade } from "./parser";
import { buildShadeDebugIndex, getShadeDebugSnapshot, getShadeInstructionsForLine } from "./debug";

describe("Shade debug model", () => {
  it("maps IR instructions back to source lines", () => {
    const program = parseShade("x = 2\nshow x").program;
    const ir = lowerShadeToIR(program);
    const index = buildShadeDebugIndex(ir);
    expect(index.get(0)?.line).toBe(0);
    expect(getShadeInstructionsForLine(ir, 2).length).toBeGreaterThan(0);
  });

  it("returns a structured snapshot for an instruction", () => {
    const program = parseShade("x = 2\nshow x").program;
    const ir = lowerShadeToIR(program);
    const snapshot = getShadeDebugSnapshot(ir, 0, { x: 2 });
    expect(snapshot?.instruction.id).toBe(0);
    expect(snapshot?.locals).toEqual({ x: 2 });
  });
});
