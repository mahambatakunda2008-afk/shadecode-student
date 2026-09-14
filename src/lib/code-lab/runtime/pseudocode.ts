import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";

type Value = number | string | boolean;
type TraceRow = { step: number; line: number; statement: string; variables: Record<string, Value> };
type ExecState = { lines: string[]; vars: Record<string, Value>; output: string[]; trace: TraceRow[]; step: number; pc: number; diagnostics: RuntimeDiagnostic[]; inputs: string[]; inputIndex: number; timeoutAt: number };
const clean = (line: string) => line.replace(/\/\/.*$/, "").trim();
function valueOf(raw: string, state: ExecState): Value { const text = raw.trim(); if (/^[-+]?\d+(?:\.\d+)?$/.test(text)) return Number(text); if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true"; if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1); if (text in state.vars) return state.vars[text]; return text; }
function numeric(v: Value) { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : 0; }
function evalExpr(raw: string, state: ExecState): Value {
  let expr = raw.trim().replace(/<>/g, "!=").replace(/\bAND\b/gi, "&&").replace(/\bOR\b/gi, "||").replace(/\bNOT\b/gi, "!").replace(/\bMOD\b/gi, "%").replace(/\bDIV\b/gi, "/").replace(/\bTRUE\b/gi, "true").replace(/\bFALSE\b/gi, "false");
  for (const [name, value] of Object.entries(state.vars)) { const literal = typeof value === "string" ? JSON.stringify(value) : String(value); expr = expr.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g"), literal); }
  if (/^[\d\s+\-*/%().<>=!&|"'A-Za-z_]+$/.test(expr)) { try { return Function(`"use strict"; return (${expr});`)(); } catch {} }
  return valueOf(raw, state);
}
function matchingEnd(lines: string[], start: number, open: RegExp, close: RegExp) { let depth = 0; for (let i = start; i < lines.length; i += 1) { const line = clean(lines[i]).toUpperCase(); if (open.test(line)) depth += 1; if (close.test(line)) { depth -= 1; if (depth === 0) return i; } } return -1; }
function traceText(trace: TraceRow[]) { if (!trace.length) return ""; const names = [...new Set(trace.flatMap((row) => Object.keys(row.variables)))]; const header = ["Step", "Line", "Statement", ...names].join(" | "); const divider = ["---", "---", "---", ...names.map(() => "---")].join(" | "); return `TRACE TABLE\n| ${header} |\n| ${divider} |\n${trace.map((row) => `| ${[String(row.step), String(row.line), row.statement, ...names.map((name) => String(row.variables[name] ?? ""))].join(" | ")} |`).join("\n")}`; }

export async function runPseudocode(request: RuntimeRequest): Promise<RuntimeResult> {
  const started = performance.now();
  const state: ExecState = { lines: request.code.split(/\r?\n/), vars: {}, output: [], trace: [], step: 0, pc: 0, diagnostics: [], inputs: request.inputs ?? [], inputIndex: 0, timeoutAt: started + Math.min(request.timeoutMs ?? 5000, 10000) };
  const events: RuntimeResult["events"] = [{ type: "status", status: "starting" }, { type: "status", status: "running" }];
  const error = (message: string, line = state.pc + 1) => state.diagnostics.push({ severity: "error", message, file: request.entryFile, line, source: "language" });
  const readInput = (prompt?: string) => { if (prompt) state.output.push(String(evalExpr(prompt, state))); return state.inputs[state.inputIndex++] ?? "0"; };
  const executeRange = async (from: number, to: number): Promise<void> => {
    let i = from;
    while (i < to && i < state.lines.length) {
      if (performance.now() > state.timeoutAt) { error("Algorithm exceeded the execution time limit.", i + 1); return; }
      state.pc = i; const line = clean(state.lines[i]); const upper = line.toUpperCase();
      if (!line || /^(BEGIN|END|THEN|ELSE|ENDIF|END IF|ENDWHILE|END WHILE|ENDFOR|END FOR|UNTIL\b|ENDCASE|END CASE)$/i.test(line)) { i += 1; continue; }
      try {
        const ifMatch = line.match(/^IF\s+(.+?)\s+THEN$/i);
        if (ifMatch) { const end = matchingEnd(state.lines, i, /^IF\b/i, /^END\s*IF$|^ENDIF$/i); if (end < 0) { error("Missing END IF / ENDIF.", i + 1); return; } const elseIndex = state.lines.slice(i + 1, end).findIndex((candidate) => /^ELSE$/i.test(clean(candidate))); const split = elseIndex < 0 ? end : i + 1 + elseIndex; if (Boolean(evalExpr(ifMatch[1], state))) await executeRange(i + 1, split); else if (elseIndex >= 0) await executeRange(split + 1, end); i = end + 1; continue; }
        const whileMatch = line.match(/^WHILE\s+(.+)$/i);
        if (whileMatch) { const end = matchingEnd(state.lines, i, /^WHILE\b/i, /^END\s*WHILE$|^ENDWHILE$/i); if (end < 0) { error("Missing END WHILE / ENDWHILE.", i + 1); return; } let guard = 0; while (Boolean(evalExpr(whileMatch[1], state))) { await executeRange(i + 1, end); if (++guard > 10000) { error("WHILE loop exceeded 10,000 iterations.", i + 1); return; } if (performance.now() > state.timeoutAt) { error("Algorithm exceeded the execution time limit.", i + 1); return; } } i = end + 1; continue; }
        const repeatMatch = /^REPEAT$/i.test(line);
        if (repeatMatch) { const end = matchingEnd(state.lines, i, /^REPEAT$/i, /^UNTIL\b/i); if (end < 0) { error("Missing UNTIL after REPEAT.", i + 1); return; } const until = clean(state.lines[end]).replace(/^UNTIL\s+/i, ""); let guard = 0; do { await executeRange(i + 1, end); if (++guard > 10000) { error("REPEAT loop exceeded 10,000 iterations.", i + 1); return; } } while (!Boolean(evalExpr(until, state))); i = end + 1; continue; }
        const forMatch = line.match(/^FOR\s+(\w+)\s*(?:←|<-|=)\s*(.+)$/i);
        if (forMatch && /\s+TO\s+/i.test(forMatch[2])) { const range = forMatch[2].split(/\s+TO\s+/i); const end = matchingEnd(state.lines, i, /^FOR\b/i, /^END\s*FOR$|^ENDFOR$/i); if (end < 0) { error("Missing END FOR / ENDFOR.", i + 1); return; } const startValue = numeric(evalExpr(range[0], state)); const finishValue = numeric(evalExpr(range[1], state)); const step = startValue <= finishValue ? 1 : -1; for (let n = startValue; step > 0 ? n <= finishValue : n >= finishValue; n += step) { state.vars[forMatch[1]] = n; await executeRange(i + 1, end); if (performance.now() > state.timeoutAt) { error("Algorithm exceeded the execution time limit.", i + 1); return; } } i = end + 1; continue; }
        const inputMatch = line.match(/^INPUT\s+(.+)$/i);
        if (inputMatch) { const parts = inputMatch[1].split(/\s*,\s*/); const name = parts[0].trim(); const prompt = parts.slice(1).join(",").trim(); state.vars[name] = valueOf(readInput(prompt), state); }
        else if (/^(OUTPUT|PRINT)\s+/i.test(line)) state.output.push(String(evalExpr(line.replace(/^(OUTPUT|PRINT)\s+/i, ""), state)));
        else if (/^(?:SET\s+)?\w+\s*(←|<-|=)/.test(line)) { const match = line.match(/^(?:SET\s+)?(\w+)\s*(?:←|<-|=)\s*(.+)$/i); if (!match) { error("Invalid assignment syntax.", i + 1); return; } state.vars[match[1]] = evalExpr(match[2], state); }
        else if (/^DECLARE\s+/i.test(line)) { const match = line.match(/^DECLARE\s+(\w+)/i); if (match) state.vars[match[1]] = 0; }
        else { error(`Unsupported pseudocode statement: ${line}`, i + 1); return; }
        state.step += 1; state.trace.push({ step: state.step, line: i + 1, statement: line, variables: { ...state.vars } });
      } catch (cause) { error(cause instanceof Error ? cause.message : "Algorithm execution failed.", i + 1); return; }
      i += 1;
    }
  };
  await executeRange(0, state.lines.length);
  const stdout = [...state.output, traceText(state.trace)].filter(Boolean).join("\n\n");
  if (stdout) events.push({ type: "stdout", text: stdout });
  for (const diagnostic of state.diagnostics) events.push({ type: "diagnostic", diagnostic });
  const failed = state.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  events.push({ type: "status", status: failed ? "failed" : "completed" }); events.push({ type: "exit", code: failed ? 1 : 0 });
  return { id: request.id, language: request.language, events, diagnostics: state.diagnostics, exitCode: failed ? 1 : 0, durationMs: Math.round(performance.now() - started) };
}
