import type { RuntimeLanguage, RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";

type Pyodide = { runPythonAsync: (code: string) => Promise<unknown>; setStdout: (options: { batched: (text: string) => void }) => void; setStderr: (options: { batched: (text: string) => void }) => void };
type SqlJsDatabase = { exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>; close: () => void };
type SqlJsModule = { Database: new () => SqlJsDatabase };

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.mjs";
const SQL_JS_URL = "https://cdn.jsdelivr.net/npm/sql.js@1.13.0/+esm";
const TYPESCRIPT_URL = "https://esm.sh/typescript@5.9.2";
let pyodidePromise: Promise<Pyodide> | null = null;
let sqlJsPromise: Promise<SqlJsModule> | null = null;
let typescriptPromise: Promise<any> | null = null;

function result(request: RuntimeRequest, events: RuntimeResult["events"], diagnostics: RuntimeResult["diagnostics"], exitCode: number | null, started: number): RuntimeResult {
  return { id: request.id, language: request.language, events, diagnostics, exitCode, durationMs: Date.now() - started };
}

function failure(request: RuntimeRequest, started: number, message: string): RuntimeResult {
  const diagnostic = { severity: "error" as const, message, source: "runtime" as const };
  return result(request, [{ type: "status", status: "starting" }, { type: "diagnostic", diagnostic }, { type: "error", message, diagnostic }, { type: "status", status: "failed" }, { type: "exit", code: 1 }], [diagnostic], 1, started);
}

async function loadPyodide() {
  if (!pyodidePromise) pyodidePromise = import(/* webpackIgnore: true */ PYODIDE_URL).then(async (module: any) => module.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/" }));
  return pyodidePromise;
}
async function loadSqlJs() {
  if (!sqlJsPromise) sqlJsPromise = import(/* webpackIgnore: true */ SQL_JS_URL).then((module: any) => module.default ?? module);
  return sqlJsPromise;
}
async function loadTypeScript() {
  if (!typescriptPromise) typescriptPromise = import(/* webpackIgnore: true */ TYPESCRIPT_URL).then((module: any) => module);
  return typescriptPromise;
}
function outputResult(request: RuntimeRequest, started: number, output: string, language: RuntimeLanguage): RuntimeResult {
  const events: RuntimeResult["events"] = [{ type: "status", status: "starting" }, { type: "status", status: "running" }];
  if (output) events.push({ type: "stdout", text: output });
  events.push({ type: "status", status: "completed" }, { type: "exit", code: 0 });
  return { ...result(request, events, [], 0, started), language };
}

export async function runBrowserPython(request: RuntimeRequest): Promise<RuntimeResult> {
  const started = Date.now();
  try {
    const pyodide = await loadPyodide();
    let stdout = "";
    let stderr = "";
    pyodide.setStdout({ batched: (text) => { stdout += `${text}\n`; } });
    pyodide.setStderr({ batched: (text) => { stderr += `${text}\n`; } });
    await pyodide.runPythonAsync(request.code);
    const events = outputResult(request, started, stdout, "python");
    if (stderr) events.events.splice(events.events.length - 2, 0, { type: "stderr", text: stderr });
    return events;
  } catch (error) {
    return failure(request, started, error instanceof Error ? error.message : String(error));
  }
}

export async function runBrowserSql(request: RuntimeRequest): Promise<RuntimeResult> {
  const started = Date.now();
  try {
    const initSqlJs = await loadSqlJs();
    const db = new initSqlJs.Database();
    const outputs: string[] = [];
    for (const statement of db.exec(request.code)) {
      const rows = [statement.columns.join(" | ")];
      for (const values of statement.values) rows.push(values.map((value) => String(value ?? "NULL")).join(" | "));
      outputs.push(rows.join("\n"));
    }
    db.close();
    return outputResult(request, started, outputs.join("\n\n"), "sql");
  } catch (error) {
    return failure(request, started, error instanceof Error ? error.message : String(error));
  }
}

export async function runBrowserTypeScript(request: RuntimeRequest): Promise<RuntimeResult> {
  const started = Date.now();
  try {
    const ts = await loadTypeScript();
    const transpiled = ts.transpileModule(request.code, { compilerOptions: { target: ts.ScriptTarget?.ES2022 ?? 7, module: ts.ModuleKind?.ESNext ?? 99, jsx: ts.JsxEmit?.ReactJSX ?? 4, strict: true }, reportDiagnostics: true });
    const diagnostics = (transpiled.diagnostics ?? []).map((diagnostic: any) => {
      const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      return { severity: "error" as const, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"), source: "compiler" as const, line: position ? position.line + 1 : undefined, column: position ? position.character + 1 : undefined };
    });
    if (diagnostics.length) return result(request, [{ type: "status", status: "starting" }, ...diagnostics.map((diagnostic: any) => ({ type: "diagnostic" as const, diagnostic })), { type: "status", status: "failed" }, { type: "exit", code: 1 }], diagnostics, 1, started);
    const jsResult = await runBrowserJavaScript({ ...request, language: "javascript", code: transpiled.outputText });
    return { ...jsResult, language: "typescript", durationMs: Date.now() - started };
  } catch (error) {
    return failure(request, started, error instanceof Error ? error.message : String(error));
  }
}
