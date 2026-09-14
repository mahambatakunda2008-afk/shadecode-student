import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";

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
const upper = (line: string) => clean(line).toUpperCase();
const isBlockOnly = (line: string) => /^(BEGIN|END|THEN|ELSE|ENDIF|END\s+IF|ENDWHILE|END\s+WHILE|ENDFOR|END\s+FOR|UNTIL\b|ENDCASE|END\s+CASE|ENDPROCEDURE|END\s+PROCEDURE)$/i.test(line);
const clone = (value: Value): Value => Array.isArray(value) ? [...value] : value;
const display = (value: Value): string => Array.isArray(value) ? `[${value.map(display).join(", ")}]` : String(value);

function valueOf(raw: string, state: ExecState): Value {
  const text = raw.trim();
  if (/^[-+]?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true";
  if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  const index = text.match(/^([A-Za-z_]\w*)\s*\[\s*(.+)\s*\]$/);
  if (index) {
    const source = state.vars[index[1]];
    if (Array.isArray(source)) return source[Math.max(0, Math.trunc(numeric(evalExpr(index[2], state))) - 1)] ?? "";
    return "";
  }
  if (text in state.vars) return clone(state.vars[text]);
  return text;
}

function numeric(v: Value) { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : 0; }
function truthy(v: Value) { return typeof v === "boolean" ? v : Boolean(numeric(v) || (typeof v === "string" && v.length)); }

function evalExpr(raw: string, state: ExecState): Value {
  let expr = raw.trim();
  const len = expr.match(/^LENGTH\s*\(\s*([A-Za-z_]\w*)\s*\)$/i);
  if (len) { const value = state.vars[len[1]]; return Array.isArray(value) || typeof value === "string" ? value.length : 0; }
  const upperExpr = expr.toUpperCase();
  if (upperExpr.startsWith("NOT ")) return !truthy(evalExpr(expr.slice(4), state));
  expr = expr.replace(/<>/g, "!=").replace(/\bAND\b/gi, "&&").replace(/\bOR\b/gi, "||").replace(/\bNOT\b/gi, "!").replace(/\bMOD\b/gi, "%").replace(/\bDIV\b/gi, "/").replace(/\bTRUE\b/gi, "true").replace(/\bFALSE\b/gi, "false");
  for (const [name, value] of Object.entries(state.vars)) {
    const literal = Array.isArray(value) ? JSON.stringify(value) : typeof value === "string" ? JSON.stringify(value) : String(value);
    expr = expr.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g"), literal);
  }
  if (/^[\d\s+\-*/%().<>=!&|"'A-Za-z_\[\],]+$/.test(expr)) {
    try { return Function(`"use strict"; return (${expr});`)(); } catch { /* fall through */ }
  }
  return valueOf(raw, state);
}

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
      if (!line || isBlockOnly(line) || /^(PROCEDURE|FUNCTION)\b/i.test(line)) { i += 1; continue; }
      try {
        const ifMatch = line.match(/^IF\s+(.+?)\s+THEN$/i);
        if (ifMatch) {
          const end = matchingEnd(state.lines, i, /^IF\b/i, /^END\s*IF$|^ENDIF$/i);
          if (end < 0) { error("Missing END IF / ENDIF.", i + 1); return; }
          const elseOffset = state.lines.slice(i + 1, end).findIndex(candidate => /^ELSE$/i.test(clean(candidate)));
          const split = elseOffset < 0 ? end : i + 1 + elseOffset;
          if (truthy(evalExpr(ifMatch[1], state))) await executeRange(i + 1, split);
          else if (elseOffset >= 0) await executeRange(split + 1, end);
          i = end + 1; continue;
        }

        const whileMatch = line.match(/^WHILE\s+(.+)$/i);
        if (whileMatch) {
          const end = matchingEnd(state.lines, i, /^WHILE\b/i, /^END\s*WHILE$|^ENDWHILE$/i);
          if (end < 0) { error("Missing END WHILE / ENDWHILE.", i + 1); return; }
          let guard = 0;
          while (truthy(evalExpr(whileMatch[1], state))) {
            await executeRange(i + 1, end);
            if (++guard > 10000) { error("WHILE loop exceeded 10,000 iterations.", i + 1); return; }
          }
          i = end + 1; continue;
        }

        if (/^REPEAT$/i.test(line)) {
          const end = matchingEnd(state.lines, i, /^REPEAT$/i, /^UNTIL\b/i);
          if (end < 0) { error("Missing UNTIL after REPEAT.", i + 1); return; }
          const condition = clean(state.lines[end]).replace(/^UNTIL\s+/i, "");
          let guard = 0;
          do { await executeRange(i + 1, end); if (++guard > 10000) { error("REPEAT loop exceeded 10,000 iterations.", i + 1); return; } } while (!truthy(evalExpr(condition, state)));
          i = end + 1; continue;
        }

        const forMatch = line.match(/^FOR\s+(\w+)\s*(?:←|<-|=)\s*(.+)$/i);
        if (forMatch && /\s+TO\s+/i.test(forMatch[2])) {
          const range = forMatch[2].split(/\s+TO\s+/i);
          const end = matchingEnd(state.lines, i, /^FOR\b/i, /^END\s*FOR$|^ENDFOR$/i);
          if (end < 0) { error("Missing END FOR / ENDFOR.", i + 1); return; }
          const startValue = numeric(evalExpr(range[0], state));
          const finishValue = numeric(evalExpr(range[1], state));
          const step = startValue <= finishValue ? 1 : -1;
          let guard = 0;
          for (let n = startValue; step > 0 ? n <= finishValue : n >= finishValue; n += step) {
            state.vars[forMatch[1]] = n; await executeRange(i + 1, end);
            if (++guard > 10000) { error("FOR loop exceeded 10,000 iterations.", i + 1); return; }
          }
          i = end + 1; continue;
        }

        const caseMatch = line.match(/^CASE\s+(.+)\s+OF$/i);
        if (caseMatch) {
          const end = matchingEnd(state.lines, i, /^CASE\b/i, /^END\s*CASE$|^ENDCASE$/i);
          if (end < 0) { error("Missing END CASE / ENDCASE.", i + 1); return; }
          const selector = evalExpr(caseMatch[1], state);
          let selected = false;
          for (let j = i + 1; j < end; j += 1) {
            const candidate = clean(state.lines[j]);
            const branch = candidate.match(/^([^:]+):$/);
            if (!branch) continue;
            const key = branch[1].trim();
            const matches = /^OTHERWISE$/i.test(key) || key.split(/\s*,\s*/).some(v => display(evalExpr(v, state)) === display(selector));
            if (matches && !selected) {
              selected = true;
              let next = end;
              for (let k = j + 1; k < end; k += 1) if (/^[^:]+:$/.test(clean(state.lines[k]))) { next = k; break; }
              await executeRange(j + 1, next);
            }
          }
          i = end + 1; continue;
        }

        const inputMatch = line.match(/^INPUT\s+(.+)$/i);
        if (inputMatch) {
          const parts = inputMatch[1].split(/\s*,\s*/); const name = parts[0].trim();
          state.vars[name] = valueOf(readInput(parts.slice(1).join(",").trim()), state);
        } else if (/^(OUTPUT|PRINT)\s+/i.test(line)) {
          state.output.push(display(evalExpr(line.replace(/^(OUTPUT|PRINT)\s+/i, ""), state)));
        } else if (/^RETURN(?:\s+(.+))?$/i.test(line)) {
          const match = line.match(/^RETURN(?:\s+(.+))?$/i); if (match?.[1]) state.vars.__return = evalExpr(match[1], state); state.returned = true;
        } else if (/^CALL\s+/i.test(line)) {
          const call = line.replace(/^CALL\s+/i, "").match(/^(\w+)\s*(?:\((.*)\))?$/);
          if (!call) { error("Invalid CALL syntax.", i + 1); return; }
          const proc = state.procedures.get(call[1].toUpperCase());
          if (!proc) { error(`Unknown procedure: ${call[1]}`, i + 1); return; }
          if (state.callDepth >= 50) { error("Procedure call depth exceeded 50.", i + 1); return; }
          const args = call[2] ? call[2].split(/\s*,\s*/).map(arg => evalExpr(arg, state)) : [];
          const saved = state.vars; state.vars = { ...saved };
          proc.params.forEach((param, index) => { state.vars[param] = clone(args[index] ?? ""); });
          state.callDepth += 1; state.returned = false; await executeRange(proc.start, proc.end); state.returned = false; state.callDepth -= 1; state.vars = saved;
        } else if (/^DECLARE\s+/i.test(line)) {
          const match = line.match(/^DECLARE\s+(\w+)(?:\s+AS\s+(?:ARRAY|LIST))?/i); if (match) state.vars[match[1]] = /\bARRAY|LIST\b/i.test(line) ? [] : 0;
        } else {
          const indexed = line.match(/^(?:SET\s+)?(\w+)\s*\[\s*(.+)\s*\]\s*(?:←|<-|=)\s*(.+)$/i);
          const assignment = line.match(/^(?:SET\s+)?(\w+)\s*(?:←|<-|=)\s*(.+)$/i);
          if (indexed) {
            const array = Array.isArray(state.vars[indexed[1]]) ? [...state.vars[indexed[1]] as Scalar[]] : [];
            const index = Math.max(0, Math.trunc(numeric(evalExpr(indexed[2], state))) - 1); array[index] = evalExpr(indexed[3], state) as Scalar; state.vars[indexed[1]] = array;
          } else if (assignment) state.vars[assignment[1]] = evalExpr(assignment[2], state);
          else { error(`Unsupported pseudocode statement: ${line}`, i + 1); return; }
        }
        state.step += 1; state.trace.push({ step: state.step, line: i + 1, statement: line, variables: Object.fromEntries(Object.entries(state.vars).filter(([key]) => key !== "__return").map(([key, value]) => [key, clone(value)])) });
      } catch (cause) { error(cause instanceof Error ? cause.message : "Algorithm execution failed.", i + 1); return; }
      i += 1;
    }
  };

  await executeRange(0, state.lines.length);
  const stdout = [...state.output, traceText(state.trace)].filter(Boolean).join("\n\n");
  if (stdout) events.push({ type: "stdout", text: stdout });
  for (const diagnostic of state.diagnostics) events.push({ type: "diagnostic", diagnostic });
  const failed = state.diagnostics.some(diagnostic => diagnostic.severity === "error");
  events.push({ type: "status", status: failed ? "failed" : "completed" }, { type: "exit", code: failed ? 1 : 0 });
  return { id: request.id, language: request.language, events, diagnostics: state.diagnostics, exitCode: failed ? 1 : 0, durationMs: Math.round(performance.now() - started) };
}
