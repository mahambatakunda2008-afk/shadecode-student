import type { ShadeExpression, ShadeProgram, ShadeStatement } from "./types";

export type ShadeIROp =
  | "const" | "load" | "store" | "binary" | "call" | "show" | "input"
  | "jump_if_false" | "jump" | "label" | "return";

export type ShadeIRInstruction = { id: number; op: ShadeIROp; args: string[]; line: number; column?: number };
export type ShadeIR = { version: "0.1"; instructions: ShadeIRInstruction[]; entry: number; labels: Record<string, number> };

export function lowerShadeToIR(program: ShadeProgram): ShadeIR {
  const instructions: ShadeIRInstruction[] = [];
  const labels: Record<string, number> = {};
  let nextId = 0;
  let nextLabel = 0;
  const emit = (op: ShadeIROp, args: string[], line: number, column?: number) => instructions.push({ id: nextId++, op, args, line, ...(column === undefined ? {} : { column }) });
  const label = (line: number, column?: number) => { const name = `L${nextLabel++}`; labels[name] = instructions.length; emit("label", [name], line, column); return name; };

  const expression = (node: ShadeExpression, fallbackLine: number, fallbackColumn?: number) => {
    const line = node.location?.line ?? fallbackLine;
    const column = node.location?.column ?? fallbackColumn;
    switch (node.type) {
      case "literal": emit("const", [JSON.stringify(node.value)], line, column); break;
      case "variable": emit("load", [node.name], line, column); break;
      case "array": node.elements.forEach((child) => expression(child, line, column)); emit("call", ["array", String(node.elements.length)], line, column); break;
      case "binary": expression(node.left, line, column); expression(node.right, line, column); emit("binary", [node.operator], line, column); break;
      case "call": node.args.forEach((child) => expression(child, line, column)); emit("call", [node.name, String(node.args.length)], line, column); break;
    }
  };

  const statement = (node: ShadeStatement) => {
    switch (node.type) {
      case "assignment": expression(node.expression, node.line); emit("store", [node.name], node.line); break;
      case "show": expression(node.expression, node.line); emit("show", [], node.line); break;
      case "input": if (node.prompt) expression(node.prompt, node.line); emit("input", [node.name], node.line); break;
      case "if": {
        expression(node.condition, node.line);
        const elseLabel = `L${nextLabel++}`; const endLabel = `L${nextLabel++}`;
        emit("jump_if_false", [elseLabel], node.line); node.thenBody.forEach(statement); emit("jump", [endLabel], node.line);
        labels[elseLabel] = instructions.length; emit("label", [elseLabel], node.line); node.elseBody.forEach(statement);
        labels[endLabel] = instructions.length; emit("label", [endLabel], node.line); break;
      }
      case "while": {
        const startLabel = label(node.line); expression(node.condition, node.line); const endLabel = `L${nextLabel++}`;
        emit("jump_if_false", [endLabel], node.line); node.body.forEach(statement); emit("jump", [startLabel], node.line);
        labels[endLabel] = instructions.length; emit("label", [endLabel], node.line); break;
      }
      case "for": expression(node.iterable, node.line); emit("call", ["iterate", node.name], node.line); node.body.forEach(statement); break;
      case "function": emit("label", [`fn:${node.name}`, ...node.params], node.line); node.body.forEach(statement); break;
      case "return": if (node.expression) expression(node.expression, node.line); emit("return", [], node.line); break;
      case "expression": expression(node.expression, node.line); break;
    }
  };

  program.body.forEach(statement);
  return { version: "0.1", instructions, entry: 0, labels };
}
