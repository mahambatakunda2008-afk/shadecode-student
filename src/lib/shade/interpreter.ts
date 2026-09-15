import type { ShadeDiagnostic, ShadeExecutionResult, ShadeExpression, ShadeProgram, ShadeStatement, ShadeValue } from "./types";
import { parseShade } from "./parser";

export type ShadeRunOptions = { inputs?: string[]; maxSteps?: number };

type FunctionValue = { params: string[]; body: ShadeStatement[] };

type Scope = { values: Map<string, ShadeValue | FunctionValue>; parent?: Scope };

export function runShade(source: string, options: ShadeRunOptions = {}): ShadeExecutionResult {
  const started = performance.now();
  const parsed = parseShade(source);
  const diagnostics = [...parsed.diagnostics];
  if (diagnostics.some((d) => d.severity === "error")) return { stdout: [], diagnostics, variables: {}, steps: 0, durationMs: performance.now() - started };

  const stdout: string[] = [];
  const inputs = [...(options.inputs ?? [])];
  const maxSteps = options.maxSteps ?? 100_000;
  let steps = 0;
  const root: Scope = { values: new Map() };

  const lookup = (scope: Scope, name: string): ShadeValue | FunctionValue | undefined => scope.values.has(name) ? scope.values.get(name) : scope.parent ? lookup(scope.parent, name) : undefined;
  const valueText = (value: ShadeValue) => value === null ? "none" : Array.isArray(value) ? `[${value.map(valueText).join(", ")}]` : String(value);
  const truthy = (value: ShadeValue) => Boolean(value);

  const evaluate = (expression: ShadeExpression, scope: Scope): ShadeValue => {
    if (++steps > maxSteps) throw new ShadeRuntimeError("Execution step limit exceeded.", 0);
    switch (expression.type) {
      case "literal": return expression.value;
      case "variable": {
        const value = lookup(scope, expression.name);
        if (value === undefined || typeof value === "object" && value !== null && !Array.isArray(value) && "body" in value) throw new ShadeRuntimeError(`Unknown value '${expression.name}'.`, 0);
        return value as ShadeValue;
      }
      case "array": return expression.elements.map((item) => evaluate(item, scope));
      case "binary": {
        const left = evaluate(expression.left, scope);
        if (expression.operator === "and") return truthy(left) && truthy(evaluate(expression.right, scope));
        if (expression.operator === "or") return truthy(left) || truthy(evaluate(expression.right, scope));
        const right = evaluate(expression.right, scope);
        switch (expression.operator) {
          case "+": return typeof left === "string" || typeof right === "string" ? valueText(left) + valueText(right) : Number(left) + Number(right);
          case "-": return Number(left) - Number(right);
          case "*": return Number(left) * Number(right);
          case "/": if (Number(right) === 0) throw new ShadeRuntimeError("Division by zero.", 0); return Number(left) / Number(right);
          case "%": if (Number(right) === 0) throw new ShadeRuntimeError("Division by zero.", 0); return Number(left) % Number(right);
          case "==": return left === right;
          case "!=": return left !== right;
          case "<": return Number(left) < Number(right);
          case "<=": return Number(left) <= Number(right);
          case ">": return Number(left) > Number(right);
          case ">=": return Number(left) >= Number(right);
        }
      }
      case "call": {
        const fn = lookup(scope, expression.name);
        const args = expression.args.map((arg) => evaluate(arg, scope));
        if (expression.name === "length") return Array.isArray(args[0]) || typeof args[0] === "string" ? args[0].length : 0;
        if (expression.name === "sum") return Array.isArray(args[0]) ? args[0].reduce((total, item) => total + Number(item), 0) : 0;
        if (!fn || Array.isArray(fn) || typeof fn !== "object" || !("body" in fn)) throw new ShadeRuntimeError(`Unknown function '${expression.name}'.`, 0);
        const child: Scope = { values: new Map(), parent: scope };
        fn.params.forEach((param, index) => child.values.set(param, args[index] ?? null));
        try { executeStatements(fn.body, child); } catch (error) { if (error instanceof ShadeReturn) return error.value; throw error; }
        return null;
      }
    }
  };

  const executeStatements = (statements: ShadeStatement[], scope: Scope): void => {
    for (const statement of statements) executeStatement(statement, scope);
  };

  const executeStatement = (statement: ShadeStatement, scope: Scope): void => {
    if (++steps > maxSteps) throw new ShadeRuntimeError("Execution step limit exceeded.", statement.line);
    switch (statement.type) {
      case "assignment": scope.values.set(statement.name, evaluate(statement.expression, scope)); return;
      case "show": stdout.push(valueText(evaluate(statement.expression, scope))); return;
      case "input": scope.values.set(statement.name, inputs.shift() ?? ""); return;
      case "expression": evaluate(statement.expression, scope); return;
      case "function": scope.values.set(statement.name, { params: statement.params, body: statement.body }); return;
      case "return": throw new ShadeReturn(statement.expression ? evaluate(statement.expression, scope) : null);
      case "if": executeStatements(truthy(evaluate(statement.condition, scope)) ? statement.thenBody : statement.elseBody, scope); return;
      case "while": { let guard = 0; while (truthy(evaluate(statement.condition, scope))) { executeStatements(statement.body, scope); if (++guard > maxSteps) throw new ShadeRuntimeError("Loop iteration limit exceeded.", statement.line); } return; }
      case "for": { const iterable = evaluate(statement.iterable, scope); if (!Array.isArray(iterable)) throw new ShadeRuntimeError("A for loop requires a list.", statement.line); for (const item of iterable) { scope.values.set(statement.name, item); executeStatements(statement.body, scope); } return; }
    }
  };

  try { executeStatements(parsed.program.body, root); }
  catch (error) { diagnostics.push({ severity: "error", message: error instanceof Error ? error.message : "Shade execution failed.", line: error instanceof ShadeRuntimeError ? error.line || 1 : 1 }); }
  const variables: Record<string, ShadeValue> = {};
  for (const [key, value] of root.values) if (value === null || typeof value !== "object" || Array.isArray(value)) variables[key] = value as ShadeValue;
  return { stdout, diagnostics, variables, steps, durationMs: performance.now() - started };
}

class ShadeRuntimeError extends Error { constructor(message: string, readonly line: number) { super(message); this.name = "ShadeRuntimeError"; } }
class ShadeReturn extends Error { constructor(readonly value: ShadeValue) { super("return"); this.name = "ShadeReturn"; } }
