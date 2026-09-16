import type { ShadeIR, ShadeIRInstruction } from "./ir";

export type ShadeDebugLocation = { line: number; instructionId: number; op: ShadeIRInstruction["op"] };

export type ShadeDebugSnapshot = {
  instruction: ShadeIRInstruction;
  location: ShadeDebugLocation;
  locals: Record<string, unknown>;
};

export function buildShadeDebugIndex(ir: ShadeIR): Map<number, ShadeDebugLocation> {
  return new Map(ir.instructions.map((instruction) => [instruction.id, {
    line: instruction.line,
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
    location: { line: instruction.line, instructionId: instruction.id, op: instruction.op },
    locals,
  };
}
