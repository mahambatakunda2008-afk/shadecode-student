import { describe, expect, it } from "vitest";
import { lowerShadeToIR } from "./ir";
import { parseShade } from "./parser";
import { buildShadeDebugIndex, getShadeDebugSnapshot, getShadeInstructionsForLine } from "./debug";

describe("Shade debug model", () => {
  it("maps every generated IR instruction back to a real source line", () => {
    const program = parseShade("x = 2\nshow x + 3").program;
    const ir = lowerShadeToIR(program);
    const index = buildShadeDebugIndex(ir);

    expect(ir.instructions.length).toBeGreaterThan(0);
    expect(ir.instructions.every((instruction) => instruction.line > 0)).toBe(true);
    expect(index.get(0)?.line).toBe(1);
    expect(getShadeInstructionsForLine(ir, 2).length).toBeGreaterThan(0);
    expect(getShadeInstructionsForLine(ir, 2).every((instruction) => instruction.line === 2)).toBe(true);
  });

  it("keeps nested expressions addressable by their owning statement line", () => {
    const program = parseShade('total = sum([1, 2, 3]) + 4\nshow total').program;
    const ir = lowerShadeToIR(program);
    const lineOne = getShadeInstructionsForLine(ir, 1);

    expect(lineOne.length).toBeGreaterThan(1);
    expect(lineOne.every((instruction) => instruction.line === 1)).toBe(true);
    expect(lineOne.some((instruction) => instruction.op === "call" && instruction.args[0] === "sum")).toBe(true);
    expect(lineOne.some((instruction) => instruction.op === "binary" && instruction.args[0] === "+")).toBe(true);
  });

  it("returns a structured snapshot for an instruction", () => {
    const program = parseShade("x = 2\nshow x").program;
    const ir = lowerShadeToIR(program);
    const snapshot = getShadeDebugSnapshot(ir, 0, { x: 2 });

    expect(snapshot?.instruction.id).toBe(0);
    expect(snapshot?.location.line).toBe(1);
    expect(snapshot?.locals).toEqual({ x: 2 });
  });
});
