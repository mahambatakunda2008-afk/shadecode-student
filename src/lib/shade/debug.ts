import type { ShadeIR, ShadeIRInstruction } from "./ir";
import type { ShadeSourceLocation, ShadeValue } from "./types";

export type ShadeDebugLocation = ShadeSourceLocation & { instructionId: number; op: ShadeIRInstruction["op"] };
export type ShadeDebugSnapshot = { instruction: ShadeIRInstruction; location: ShadeDebugLocation; locals: Record<string, unknown> };
export type ShadeTracePhase = "statement" | "expression" | "output" | "input" | "error";
export type ShadeExecutionTraceEvent = { step: number; phase: ShadeTracePhase; statementType?: string; expressionType?: string; location: ShadeSourceLocation; instructionId?: number; op?: ShadeIRInstruction["op"]; locals: Record<string, ShadeValue>; stdoutDelta?: string[]; durationMs: number };
export type ShadeExecutionTrace = { events: ShadeExecutionTraceEvent[]; truncated: boolean; maxEvents: number };
export type ShadeDebugCommand = "continue" | "step-over" | "step-back" | "restart";
export type ShadeDebugState = { cursor: number; event: ShadeExecutionTraceEvent | null; stopped: boolean; reason: "breakpoint" | "end" | "start" };

/** Deterministic replay debugger over a completed trace. Live pausing remains a native-runtime concern. */
export class ShadeDebugSession {
  private readonly breakpoints = new Set<number>();
  private cursor = -1;
  constructor(private readonly trace: ShadeExecutionTrace) {}
  setBreakpoint(line: number): void { if (line > 0) this.breakpoints.add(line); }
  removeBreakpoint(line: number): void { this.breakpoints.delete(line); }
  toggleBreakpoint(line: number): boolean { if (this.breakpoints.delete(line)) return false; this.setBreakpoint(line); return true; }
  clearBreakpoints(): void { this.breakpoints.clear(); }
  getBreakpoints(): number[] { return [...this.breakpoints].sort((a, b) => a - b); }
  getState(): ShadeDebugState { return { cursor: this.cursor, event: this.trace.events[this.cursor] ?? null, stopped: this.cursor >= this.trace.events.length - 1, reason: this.cursor < 0 ? "start" : this.cursor >= this.trace.events.length - 1 ? "end" : "breakpoint" }; }
  continue(): ShadeDebugState { for (let index = this.cursor + 1; index < this.trace.events.length; index += 1) { this.cursor = index; if (this.breakpoints.has(this.trace.events[index].location.line)) break; } return this.getState(); }
  stepOver(): ShadeDebugState { if (this.cursor < this.trace.events.length - 1) this.cursor += 1; return this.getState(); }
  stepBack(): ShadeDebugState { if (this.cursor >= 0) this.cursor -= 1; return this.getState(); }
  restart(): ShadeDebugState { this.cursor = -1; return this.getState(); }
}

export function buildShadeDebugIndex(ir: ShadeIR): Map<number, ShadeDebugLocation> {
  return new Map(ir.instructions.map((instruction) => [instruction.id, { line: instruction.line, ...(instruction.column === undefined ? {} : { column: instruction.column }), instructionId: instruction.id, op: instruction.op }]));
}
export function getShadeInstructionsForLine(ir: ShadeIR, line: number): ShadeIRInstruction[] { return ir.instructions.filter((instruction) => instruction.line === line); }
export function getShadeDebugSnapshot(ir: ShadeIR, instructionId: number, locals: Record<string, unknown> = {}): ShadeDebugSnapshot | null {
  const instruction = ir.instructions.find((candidate) => candidate.id === instructionId);
  if (!instruction) return null;
  return { instruction, location: { line: instruction.line, ...(instruction.column === undefined ? {} : { column: instruction.column }), instructionId: instruction.id, op: instruction.op }, locals };
}
