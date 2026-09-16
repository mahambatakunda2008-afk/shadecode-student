import type { ShadeIR, ShadeIRInstruction } from "./ir";
import type { ShadeSourceLocation, ShadeValue } from "./types";

export type ShadeDebugLocation = ShadeSourceLocation & {
  instructionId: number;
  op: ShadeIRInstruction["op"];
};

export type ShadeDebugSnapshot = {
  instruction: ShadeIRInstruction;
  location: ShadeDebugLocation;
  locals: Record<string, unknown>;
};

export type ShadeTracePhase = "statement" | "expression" | "output" | "input" | "error";

export type ShadeExecutionTraceEvent = {
  step: number;
  phase: ShadeTracePhase;
  statementType?: string;
  expressionType?: string;
  location: ShadeSourceLocation;
  instructionId?: number;
  op?: ShadeIRInstruction["op"];
  locals: Record<string, ShadeValue>;
  stdoutDelta?: string[];
  durationMs: number;
};

export type ShadeExecutionTrace = {
  events: ShadeExecutionTraceEvent[];
  truncated: boolean;
  maxEvents: number;
};

export function buildShadeDebugIndex(ir: ShadeIR): Map<number, ShadeDebugLocation> {
  return new Map(ir.instructions.map((instruction) => [instruction.id, {
    line: instruction.line,
    ...(instruction.column === undefined ? {} : { column: instruction.column }),
    instructionId: instruction.id,
    op: instruction.op,
  }]));
}

export function getShadeInstructionsForLine(ir: ShadeIR, line: number): ShadeIRInstruction[] {
  return ir.instructions.filter((instruction) => instruction.line === line);
}

export function getShadeDebugSnapshot(ir: ShadeIR, instructionId: number, locals: Record<string, unknown> = {}): ShadeDebugSnapshot | null {
  const instruction = ir.instructions.find((candidate) => candidate.id === instructionId);
  if (!instruction) return null;
  return {
    instruction,
    location: {
      line: instruction.line,
      ...(instruction.column === undefined ? {} : { column: instruction.column }),
      instructionId: instruction.id,
      op: instruction.op,
    },
    locals,
  };
}
