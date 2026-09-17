import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";
import { evaluateExpression } from "./expression-parser";

type Scalar = number | string | boolean;
type Value = Scalar | Scalar[];
type TraceRow = { step: number; line: number; statement: string; variables: Record<string, Value> };
type Procedure = { name: string; params: string[]; start: number; end: number };
type ExecState = {
  lines: string[];
  vars: Record<string, Value>;
  output: string[];
  trace: TraceRow[];
  step: number;
  pc: number;
  diagnostics: RuntimeDiagnostic[];
  inputs: string[];
  inputIndex: number;
  timeoutAt: number;
  procedures: Map<string, Procedure>;
  callDepth: number;
  returned: boolean;
};

const clean = (line: string) => line.replace(/\/\/.*$/, "").replace(/\{\*.*?\*\}/g, "").trim();
const isBlockOnly = (line: string) => /^(BEGIN|END|THEN|ELSE|ENDIF|END\s+IF|ENDWHILE|END\s+WHILE|ENDFOR|END\s+FOR|UNTIL\b|ENDCASE|END\s+CASE|ENDPROCEDURE|END\s+PROCEDURE)$/i.test(line);
const clone = (value: Value): Value => Array.isArray(value) ? [...value] : value;
const display = (value: Value): string => Array.isArray(value) ? `[${value.map(display).join(", ")}]` : String(value);

function numeric(v: Value) { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : 0; }
function truthy(v: Value) { return typeof v === "boolean" ? v : Boolean(numeric(v) || (typeof v === "string" && v.length)); }
function evalExpr(raw: string, state: ExecState): Value { return evaluateExpression(raw, state.vars) as Value; }
function valueOf(raw: string, state: ExecState): Value { try { return evalExpr(raw.trim(), state); } catch { return raw.trim(); } }

function matchingEnd(lines: string[], start: number, opens: RegExp, closes: RegExp) {
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    const line = clean(lines[i]);
    if (opens.test(line)) depth += 1;
    if (closes.test(line)) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function collectProcedures(lines: string[]) {
  const procedures = new Map<string, Procedure>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = clean(lines[i]);
    const match = line.match(/^(?:PROCEDURE|FUNCTION)\s+(\w+)\s*(?:\(([^)]*)\))?/i);
    if (!match) continue;
    const end = matchingEnd(lines, i, /^(?:PROCEDURE|FUNCTION)\b/i, /^END\s*(?:PROCEDURE|FUNCTION)$|^ENDPROCEDURE$|^ENDFUNCTION$/i);
    if (end >= 0) procedures.set(match[1].toUpperCase(), { name: match[1], params: (match[2] ?? "").split(",").map(v => v.trim()).filter(Boolean), start: i + 1, end });
  }
  return procedures;
}

function traceText(trace: TraceRow[]) {
  if (!trace.length) return "";
  const names = [...new Set(trace.flatMap(row => Object.keys(row.variables)))];
  const header = ["Step", "Line", "Statement", ...names].join(" | ");
  const divider = ["---", "---", "---", ...names.map(() => "---")].join(" | ");
  return `TRACE TABLE\n| ${header} |\n| ${divider} |\n${trace.map(row => `| ${[String(row.step), String(row.line), row.statement, ...names.map(name => display(row.variables[name] ?? ""))].join(" | ")} |`).join("\n")}`;
}

export async function runPseudocode(request: RuntimeRequest): Promise<RuntimeResult> {
  const started = performance.now();
  const state: ExecState = {
    lines: request.code.split(/\r?\n/), vars: {}, output: [], trace: [], step: 0, pc: 0,
    diagnostics: [], inputs: request.inputs ?? [], inputIndex: 0,
    timeoutAt: started + Math.min(request.timeoutMs ?? 5000, 10000), procedures: new Map(), callDepth: 0, returned: false,
  };
  state.procedures = collectProcedures(state.lines);
  const events: RuntimeResult["events"] = [{ type: "status", status: "starting" }, { type: "status", status: "running" }];
  const error = (message: string, line = state.pc + 1) => state.diagnostics.push({ severity: "error", message, file: request.entryFile, line, source: "language" });
  const readInput = (prompt?: string) => { if (prompt) state.output.push(display(evalExpr(prompt, state))); return state.inputs[state.inputIndex++] ?? ""; };

  const executeRange = async (from: number, to: number): Promise<void> => {
    let i = from;
    while (i < to && i < state.lines.length && !state.returned) {
      if (performance.now() > state.timeoutAt) { error("Algorithm exceeded the execution time limit.", i + 1); return; }
      state.pc = i;
      const line = clean(state.lines[i]);
      if (!line || isBlockOnly(line) || /^(?:PROCEDURE|FUNCTION)\b/i.test(line)) { i += 1; continue; }
      const record = (statement: string) => { state.step += 1; state.trace.push({ step: state.step, line: i + 1, statement, variables: Object.fromEntries(Object.entries(state.vars).map(([key, value]) => [key, clone(value)])) }); };
      record(line);

      const inputMatch = line.match(/^INPUT\s+(.+)$/i);
      if (inputMatch) {
        const parts = inputMatch[1].split(/\s*,\s*/); const name = parts[0].trim();
        state.vars[name] = readInput(parts.slice(1).join(",").trim());
      } else if (/^(OUTPUT|PRINT)\s+/i.test(line)) {
        state.output.push(display(evalExpr(line.replace(/^(OUTPUT|PRINT)\s+/i, ""), state)));
      } else if (/^RETURN(?:\s+(.+))?$/i.test(line)) {
        const match = line.match(/^RETURN(?:\s+(.+))?$/i); if (match?.[1]) state.vars.__return = evalExpr(match[1], state); state.returned = true;
      } else if (/^CALL\s+/i.test(line)) {
        const call = line.replace(/^CALL\s+/i, "").match(/^(\w+)\s*(?:\((.*)\))?$/);
        if (!call) { error("Invalid CALL syntax.", i + 1); return; }
        const proc = state.procedures.get(call[1].toUpperCase());
        if (!proc) { error(`Unknown procedure: ${call[1]}`, i + 1); return; }
        if (state.callDepth >= 32) { error("Maximum procedure call depth exceeded.", i + 1); return; }
        const args = (call[2] ?? "").split(/\s*,\s*/).filter(Boolean).map(arg => valueOf(arg, state));
        const previous: Record<string, Value | undefined> = {};
        proc.params.forEach((param, index) => { previous[param] = state.vars[param]; if (index < args.length) state.vars[param] = args[index]; });
        state.callDepth += 1; const returned = state.returned; state.returned = false;
        await executeRange(proc.start, proc.end);
        state.returned = returned; state.callDepth -= 1;
        proc.params.forEach(param => { if (previous[param] === undefined) delete state.vars[param]; else state.vars[param] = previous[param]!; });
      } else {
        const assignment = line.match(/^(?:SET\s+)?([A-Za-z_]\w*(?:\s*\[\s*.+?\s*\])?)\s*(?:←|<-|:=|=)\s*(.+)$/);
        if (assignment) {
          const target = assignment[1].replace(/\s+/g, ""); const value = valueOf(assignment[2], state);
          const indexed = target.match(/^([A-Za-z_]\w*)\[(.+)\]$/);
          if (indexed) { const array = state.vars[indexed[1]]; if (!Array.isArray(array)) { error(`Variable ${indexed[1]} is not an array.`, i + 1); return; } const index = Math.trunc(numeric(valueOf(indexed[2], state))) - 1; if (index < 0 || index >= array.length) { error("Array index out of bounds.", i + 1); return; } array[index] = value as Scalar; }
          else state.vars[target] = value;
        } else if (/^IF\s+/i.test(line)) {
          const end = matchingEnd(state.lines, i, /^IF\b/i, /^END\s*IF$|^ENDIF$/i); if (end < 0) { error("Missing END IF.", i + 1); return; }
          const elseIndex = state.lines.slice(i + 1, end).findIndex(candidate => /^ELSE$/i.test(clean(candidate)));
          const condition = truthy(evalExpr(line.replace(/^IF\s+/i, "").replace(/\s+THEN$/i, ""), state));
          const thenEnd = elseIndex >= 0 ? i + 1 + elseIndex : end;
          if (condition) await executeRange(i + 1, thenEnd); else if (elseIndex >= 0) await executeRange(thenEnd + 1, end);
          i = end;
        } else if (/^WHILE\s+/i.test(line)) {
          const end = matchingEnd(state.lines, i, /^WHILE\b/i, /^END\s*WHILE$|^ENDWHILE$/i); if (end < 0) { error("Missing END WHILE.", i + 1); return; }
          let guard = 0; while (truthy(evalExpr(line.replace(/^WHILE\s+/i, "").replace(/\s+DO$/i, ""), state)) && !state.returned) { await executeRange(i + 1, end); if (++guard > 10000) { error("Loop exceeded the iteration limit.", i + 1); return; } }
          i = end;
        } else if (/^FOR\s+/i.test(line)) {
          const match = line.match(/^FOR\s+(\w+)\s*(?:←|<-|:=|=)\s*(.+?)\s+(?:TO|DOWNTO)\s+(.+?)(?:\s+STEP\s+(.+?))?$/i); const end = matchingEnd(state.lines, i, /^FOR\b/i, /^END\s*FOR$|^ENDFOR$/i); if (!match || end < 0) { error("Invalid FOR loop.", i + 1); return; }
          const down = /DOWNTO/i.test(line); const startValue = Math.trunc(numeric(valueOf(match[2], state))); const endValue = Math.trunc(numeric(valueOf(match[3], state))); const step = Math.abs(Math.trunc(numeric(valueOf(match[4] ?? "1", state)))) || 1;
          for (let value = startValue; down ? value >= endValue : value <= endValue; value += down ? -step : step) { state.vars[match[1]] = value; await executeRange(i + 1, end); if (state.returned) break; }
          i = end;
        } else if (/^DECLARE\s+/i.test(line)) {
          for (const name of line.replace(/^DECLARE\s+/i, "").split(/\s*,\s*/)) if (name.trim()) state.vars[name.trim()] = 0;
        } else if (!/^BEGIN$/i.test(line)) {
          error(`Unsupported statement: ${line}`, i + 1); return;
        }
      }
      i += 1;
    }
  };

  await executeRange(0, state.lines.length);
  const hasErrors = state.diagnostics.some(diagnostic => diagnostic.severity === "error");
  if (state.trace.length) events.push({ type: "trace", text: traceText(state.trace) });
  if (state.output.length) events.push({ type: "stdout", text: state.output.join("\n") });
  if (state.diagnostics.length) for (const diagnostic of state.diagnostics) events.push({ type: "diagnostic", diagnostic });
  events.push({ type: "status", status: hasErrors ? "failed" : "completed" }, { type: "exit", code: hasErrors ? 1 : 0 });
  return { id: request.id, language: request.language, events, diagnostics: state.diagnostics, exitCode: hasErrors ? 1 : 0, durationMs: performance.now() - started };
}
