import { describe, expect, it } from "vitest";
import { lowerShadeToIR } from "./ir";
import { parseShade } from "./parser";
import { buildShadeDebugIndex, getShadeDebugSnapshot, getShadeInstructionsForLine, ShadeDebugSession, type ShadeExecutionTrace } from "./debug";
import { runShade } from "./interpreter";

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

  it("supports breakpoint continue and deterministic stepping", () => {
    const trace: ShadeExecutionTrace = {
      events: [1, 2, 3, 4].map((step) => ({ step, phase: "statement", statementType: "assignment", location: { line: step }, locals: { x: step }, durationMs: 0 })),
      truncated: false,
      maxEvents: 10,
    };
    const session = new ShadeDebugSession(trace);
    session.setBreakpoint(3);
    expect(session.getState().reason).toBe("start");
    expect(session.continue().event?.step).toBe(3);
    expect(session.stepBack().event?.step).toBe(2);
    expect(session.stepOver().event?.step).toBe(3);
    expect(session.restart().cursor).toBe(-1);
    expect(session.getBreakpoints()).toEqual([3]);
  });

  it("records deterministic function call frames for replay", () => {
    const result = runShade("function add(a, b)\n  return a + b\nend\n\ntotal = add(2, 3)\nshow total", { trace: true });
    const trace = result.trace;
    expect(trace?.events.length).toBeGreaterThan(0);
    const functionEvent = trace?.events.find((event) => event.callDepth === 1 && event.callStack?.includes("add"));
    expect(functionEvent?.frameId).toMatch(/^frame-/);
    expect(functionEvent?.locals).toMatchObject({ a: 2, b: 3 });
    expect(functionEvent?.callStack).toEqual(["global", "add"]);
    expect(trace?.events.some((event) => (event.callDepth ?? 0) > 1)).toBe(false);
  });

  it("steps over nested function events instead of stopping inside the call", () => {
    const trace: ShadeExecutionTrace = {
      events: [
        { step: 1, phase: "statement", statementType: "assignment", location: { line: 5 }, frameId: "global", callDepth: 0, callStack: ["global"], locals: {}, durationMs: 0 },
        { step: 2, phase: "statement", statementType: "return", location: { line: 2 }, frameId: "frame-1", callDepth: 1, callStack: ["global", "add"], locals: { a: 2, b: 3 }, durationMs: 0 },
        { step: 3, phase: "expression", expressionType: "binary", location: { line: 2 }, frameId: "frame-1", callDepth: 1, callStack: ["global", "add"], locals: { a: 2, b: 3 }, durationMs: 0 },
        { step: 4, phase: "expression", expressionType: "call", location: { line: 5 }, frameId: "global", callDepth: 0, callStack: ["global"], locals: { total: 5 }, durationMs: 0 },
      ],
      truncated: false,
      maxEvents: 10,
    };
    const session = new ShadeDebugSession(trace);
    expect(session.stepOver().event?.step).toBe(1);
    expect(session.stepOver().event?.step).toBe(4);
  });
});
