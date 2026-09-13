import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";

type WorkerMessage =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string; stack?: string; diagnostic?: RuntimeDiagnostic };

const WORKER_SOURCE = `
function normalizePath(path) {
  const parts = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop(); else parts.push(part);
  }
  return parts.join("/");
}
function resolveImport(fromPath, specifier, files) {
  if (!specifier.startsWith(".")) return null;
  const base = fromPath.split("/").slice(0, -1).join("/");
  const raw = normalizePath(base + "/" + specifier);
  const candidates = [raw, raw + ".js", raw + ".mjs", raw + ".ts", raw + ".tsx", raw + "/index.js", raw + "/index.ts"];
  return candidates.find((candidate) => files.has(candidate)) || null;
}
function dataUrl(source, path) {
  return "data:text/javascript;charset=utf-8," + encodeURIComponent(source + "\\n//# sourceURL=code-lab://" + path);
}
function buildModuleUrl(path, files, cache, building) {
  if (cache.has(path)) return cache.get(path);
  if (building.has(path)) throw new Error("Circular workspace import detected at '" + path + "'.");
  const source = files.get(path);
  if (source == null) throw new Error("Workspace file '" + path + "' was not found.");
  building.add(path);
  const pattern = /\\b(import\\s+(?:[\\s\\S]*?\\s+from\\s+|)|export\\s+(?:[\\s\\S]*?\\s+from\\s+))(["'])(\\.\\.?\\/[^"']+)\\2/g;
  const transformed = source.replace(pattern, (full, prefix, quote, specifier) => {
    const resolved = resolveImport(path, specifier, files);
    if (!resolved) throw new Error("Cannot resolve module '" + specifier + "' imported by '" + path + "'.");
    return prefix + quote + buildModuleUrl(resolved, files, cache, building) + quote;
  });
  building.delete(path);
  const url = dataUrl(transformed, path);
  cache.set(path, url);
  return url;
}
async function runModules(request) {
  const files = new Map();
  for (const file of request.files || []) files.set(file.path.replace(/^\\/+/, ""), file.content);
  const entry = request.entryFile || "main.js";
  if (!files.has(entry)) files.set(entry, request.code);
  if (!/\\.(js|mjs)$/.test(entry)) throw new Error("Only JavaScript entry files can execute in the browser runtime right now.");
  const entryUrl = buildModuleUrl(entry, files, new Map(), new Set());
  await import(entryUrl);
}
self.onmessage = async (event) => {
  const request = event.data;
  const originalLog = console.log;
  const originalError = console.error;
  const emit = (message) => self.postMessage(message);
  const emitText = (type, values) => emit({ type, text: values.map((value) => { try { return typeof value === "string" ? value : JSON.stringify(value); } catch { return String(value); } }).join(" ") });
  console.log = (...values) => emitText("stdout", values);
  console.error = (...values) => emitText("stderr", values);
  emit({ type: "status", status: "running" });
  try {
    await runModules(request);
    emit({ type: "status", status: "completed" });
    emit({ type: "exit", code: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack || "" : "";
    emit({ type: "stderr", text: stack || message });
    emit({ type: "error", message, stack });
    emit({ type: "status", status: "failed" });
    emit({ type: "exit", code: 1 });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};
`;

function diagnosticFromError(message: string, stack?: string): RuntimeDiagnostic {
  const location = stack?.match(/code-lab:\/\/([^\\s:)]+).*?:(\\d+):(\\d+)/m);
  if (location) return { severity: "error", message, file: location[1], line: Number(location[2]), column: Number(location[3]), source: "runtime" };
  const fallback = stack?.match(/:(\\d+):(\\d+)(?:\\)?$/m);
  return { severity: "error", message, line: fallback ? Number(fallback[1]) : undefined, column: fallback ? Number(fallback[2]) : undefined, source: "runtime" };
}

export function runBrowserJavaScript(request: RuntimeRequest): Promise<RuntimeResult> {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return Promise.reject(new Error("Browser runtime workers are unavailable in this environment."));
  const started = performance.now();
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 5000, 250), 15000);
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  const worker = new Worker(blobUrl);
  return new Promise((resolve) => {
    const events: RuntimeResult["events"] = [];
    const diagnostics: RuntimeDiagnostic[] = [];
    let settled = false;
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      resolve({ id: request.id, language: request.language, events, diagnostics, exitCode, durationMs: Math.round(performance.now() - started) });
    };
    const timer = window.setTimeout(() => {
      const diagnostic: RuntimeDiagnostic = { severity: "error", message: `Execution exceeded ${timeoutMs}ms and was terminated.`, source: "runtime" };
      diagnostics.push(diagnostic);
      events.push({ type: "status", status: "timed_out" });
      events.push({ type: "error", message: diagnostic.message, diagnostic });
      finish(null);
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      events.push(event.data);
      if (event.data.type === "error") {
        const diagnostic = diagnosticFromError(event.data.message, event.data.stack);
        diagnostics.push(diagnostic);
        events[events.length - 1] = { ...event.data, diagnostic };
      }
      if (event.data.type === "exit") finish(event.data.code);
    };
    worker.onerror = (event) => {
      const diagnostic = diagnosticFromError(event.message || "The runtime worker failed.");
      diagnostics.push(diagnostic);
      events.push({ type: "error", message: diagnostic.message, diagnostic });
      events.push({ type: "status", status: "failed" });
      finish(1);
    };
    worker.postMessage(request);
  });
}
