import type { ShadeExecutionTraceEvent } from "./debug";
import type { ShadeExecutionResult, ShadeExpression, ShadeProgram, ShadeStatement, ShadeValue } from "./types";
import { parseShade } from "./parser";

export type ShadeRunOptions = { inputs?: string[]; maxSteps?: number; trace?: boolean; maxTraceEvents?: number };
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
  const tracing = options.trace ?? false;
  const maxTraceEvents = Math.max(1, options.maxTraceEvents ?? 2_000);
  const traceEvents: ShadeExecutionTraceEvent[] = [];
  let traceTruncated = false;
  let steps = 0;
  const root: Scope = { values: new Map() };

  const lookup = (scope: Scope, name: string): ShadeValue | FunctionValue | undefined => scope.values.has(name) ? scope.values.get(name) : scope.parent ? lookup(scope.parent, name) : undefined;
  const valueText = (value: ShadeValue): string => {
    if (value === null) return "none";
    if (Array.isArray(value)) return `[${value.map((item: ShadeValue) => valueText(item)).join(", ")}]`;
    return String(value);
  };
  const truthy = (value: ShadeValue): boolean => Boolean(value);
  const numeric = (value: ShadeValue): number => typeof value === "number" ? value : Number(value);
  const snapshot = (scope: Scope): Record<string, ShadeValue> => {
    const chain: Scope[] = [];
    let current: Scope | undefined = scope;
    while (current) { chain.unshift(current); current = current.parent; }
    const values: Record<string, ShadeValue> = {};
    for (const entry of chain) for (const [key, value] of entry.values) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) values[key] = value as ShadeValue;
    }
    return values;
  };
  const recordTrace = (event: Omit<ShadeExecutionTraceEvent, "step">) => {
    if (!tracing) return;
    if (traceEvents.length >= maxTraceEvents) { traceTruncated = true; return; }
    traceEvents.push({ ...event, step: traceEvents.length + 1 });
  };

  const evaluate = (expression: ShadeExpression, scope: Scope): ShadeValue => {
    const expressionStarted = performance.now();
    if (++steps > maxSteps) throw new ShadeRuntimeError("Execution step limit exceeded.", expression.location?.line ?? 0, expression.location?.column);
    let result: ShadeValue;
    switch (expression.type) {
      case "literal": result = expression.value; break;
      case "variable": {
        const value = lookup(scope, expression.name);
        if (value === undefined || (typeof value === "object" && value !== null && !Array.isArray(value) && "body" in value)) throw new ShadeRuntimeError(`Unknown value '${expression.name}'.`, expression.location?.line ?? 0, expression.location?.column);
        result = value;
        break;
      }
      case "array": result = expression.elements.map((item) => evaluate(item, scope)); break;
      case "binary": {
        const left = evaluate(expression.left, scope);
        if (expression.operator === "and") result = truthy(left) && truthy(evaluate(expression.right, scope));
        else if (expression.operator === "or") result = truthy(left) || truthy(evaluate(expression.right, scope));
        else {
          const right = evaluate(expression.right, scope);
          switch (expression.operator) {
            case "+": result = typeof left === "string" || typeof right === "string" ? valueText(left) + valueText(right) : numeric(left) + numeric(right); break;
            case "-": result = numeric(left) - numeric(right); break;
            case "*": result = numeric(left) * numeric(right); break;
            case "/": if (numeric(right) === 0) throw new ShadeRuntimeError("Division by zero.", expression.location?.line ?? 0, expression.location?.column); result = numeric(left) / numeric(right); break;
            case "%": if (numeric(right) === 0) throw new ShadeRuntimeError("Division by zero.", expression.location?.line ?? 0, expression.location?.column); result = numeric(left) % numeric(right); break;
            case "==": result = left === right; break;
            case "!=": result = left !== right; break;
            case "<": result = numeric(left) < numeric(right); break;
            case "<=": result = numeric(left) <= numeric(right); break;
            case ">": result = numeric(left) > numeric(right); break;
            case ">=": result = numeric(left) >= numeric(right); break;
            default: throw new ShadeRuntimeError(`Unsupported operator '${expression.operator}'.`, expression.location?.line ?? 0, expression.location?.column);
          }
        }
      } break;
      case "call": {
        const fn = lookup(scope, expression.name);
        const args = expression.args.map((arg) => evaluate(arg, scope));
        if (expression.name === "length") result = Array.isArray(args[0]) || typeof args[0] === "string" ? args[0].length : 0;
        else if (expression.name === "sum") {
          if (!Array.isArray(args[0])) result = 0;
          else { let total = 0; for (const item of args[0]) total += numeric(item); result = total; }
        } else {
          if (!fn || Array.isArray(fn) || typeof fn !== "object" || !("body" in fn)) throw new ShadeRuntimeError(`Unknown function '${expression.name}'.`, expression.location?.line ?? 0, expression.location?.column);
          const child: Scope = { values: new Map(), parent: scope };
          fn.params.forEach((param, index) => child.values.set(param, args[index] ?? null));
          try { executeStatements(fn.body, child); } catch (error) { if (error instanceof ShadeReturn) result = error.value; else throw error; }
          if (result === undefined) result = null;
        }
      } break;
    }
    recordTrace({ phase: "expression", expressionType: expression.type, location: expression.location ?? { line: 0 }, locals: snapshot(scope), durationMs: performance.now() - expressionStarted });
    return result!;
  };

  const executeStatements = (statements: ShadeStatement[], scope: Scope): void => {
    for (const statement of statements) executeStatement(statement, scope);
  };

  const executeStatement = (statement: ShadeStatement, scope: Scope): void => {
    const statementStarted = performance.now();
    if (++steps > maxSteps) throw new ShadeRuntimeError("Execution step limit exceeded.", statement.line);
    const stdoutBefore = stdout.length;
    const traceIndex = traceEvents.length;
    recordTrace({ phase: "statement", statementType: statement.type, location: { line: statement.line }, locals: snapshot(scope), durationMs: 0 });
    switch (statement.type) {
      case "assignment": scope.values.set(statement.name, evaluate(statement.expression, scope)); break;
      case "show": stdout.push(valueText(evaluate(statement.expression, scope))); break;
      case "input": if (statement.prompt) evaluate(statement.prompt, scope); scope.values.set(statement.name, inputs.shift() ?? ""); break;
      case "expression": evaluate(statement.expression, scope); break;
      case "function": scope.values.set(statement.name, { params: statement.params, body: statement.body }); break;
      case "return": throw new ShadeReturn(statement.expression ? evaluate(statement.expression, scope) : null);
      case "if": executeStatements(truthy(evaluate(statement.condition, scope)) ? statement.thenBody : statement.elseBody, scope); break;
      case "while": {
        let guard = 0;
        while (truthy(evaluate(statement.condition, scope))) {
          executeStatements(statement.body, scope);
          if (++guard > maxSteps) throw new ShadeRuntimeError("Loop iteration limit exceeded.", statement.line);
        }
        break;
      }
      case "for": {
        const iterable = evaluate(statement.iterable, scope);
        if (!Array.isArray(iterable)) throw new ShadeRuntimeError("A for loop requires a list.", statement.line);
        for (const item of iterable) { scope.values.set(statement.name, item); executeStatements(statement.body, scope); }
        break;
      }
    }
    if (tracing && traceEvents[traceIndex]?.phase === "statement") {
      traceEvents[traceIndex].locals = snapshot(scope);
      traceEvents[traceIndex].stdoutDelta = stdout.slice(stdoutBefore);
      traceEvents[traceIndex].durationMs = performance.now() - statementStarted;
    }
  };

  try { executeStatements(parsed.program.body, root); }
  catch (error) {
    const line = error instanceof ShadeRuntimeError ? error.line || 1 : 1;
    const column = error instanceof ShadeRuntimeError ? error.column : undefined;
    diagnostics.push({ severity: "error", message: error instanceof Error ? error.message : "Shade execution failed.", line, ...(column === undefined ? {} : { column }) });
    recordTrace({ phase: "error", location: { line, ...(column === undefined ? {} : { column }) }, locals: snapshot(root), durationMs: 0 });
  }
  const variables: Record<string, ShadeValue> = {};
  for (const [key, value] of root.values) if (value === null || typeof value !== "object" || Array.isArray(value)) variables[key] = value as ShadeValue;
  return { stdout, diagnostics, variables, steps, durationMs: performance.now() - started, ...(tracing ? { trace: { events: traceEvents, truncated: traceTruncated, maxEvents: maxTraceEvents } } : {}) };
}

class ShadeRuntimeError extends Error {
  constructor(message: string, readonly line: number, readonly column?: number) { super(message); this.name = "ShadeRuntimeError"; }
}
class ShadeReturn extends Error { constructor(readonly value: ShadeValue) { super("return"); this.name = "ShadeReturn"; } }

export type { ShadeProgram };
