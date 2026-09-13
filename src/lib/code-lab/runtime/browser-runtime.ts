import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";

type WorkerMessage =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string; stack?: string; diagnostic?: RuntimeDiagnostic };

const WORKER_SOURCE = `
const moduleUrls = new Map();
const createdUrls = [];

function emit(message) {
  self.postMessage(message);
}

function normalizePath(path) {
  const parts = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
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

function rewriteImports(source, filePath, files) {
  const pattern = /\\b(import\\s+(?:[\\s\\S]*?\\s+from\\s+|)|export\\s+(?:[\\s\\S]*?\\s+from\\s+))(["'])(\\.\\.?\\/[^"']+)\\2/g;
  return source.replace(pattern, (full, prefix, quote, specifier) => {
    const resolved = resolveImport(filePath, specifier, files);
    if (!resolved) throw new Error("Cannot resolve module '" + specifier + "' imported by '" + filePath + "'.");
    return prefix + quote + moduleUrls.get(resolved) + quote;
  });
}

async function runModules(request) {
  const inputFiles = new Map();
  for (const file of request.files || []) inputFiles.set(file.path.replace(/^\\/+/, ""), file.content);
  const entry = request.entryFile || "main.js";
  if (!inputFiles.has(entry)) inputFiles.set(entry, request.code);

  for (const [path, source] of inputFiles) {
    if (!/\\.(js|mjs|ts|tsx)$/.test(path)) continue;
    const transformed = rewriteImports(source, path, inputFiles) + "\\n//# sourceURL=code-lab://" + path;
    const blob = new Blob([transformed], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    moduleUrls.set(path, url);
    createdUrls.push(url);
  }

  const entryUrl = moduleUrls.get(entry);
  if (!entryUrl) throw new Error("The entry file '" + entry + "' is not executable JavaScript.");
  await import(entryUrl);
}

self.onmessage = async (event) => {
  const request = event.data;
  const originalLog = console.log;
  const originalError = console.error;
  const emitText = (type, values) => emit({ type, text: values.map((value) => {
    try { return typeof value === "string" ? value : JSON.stringify(value); }
    catch { return String(value); }
  }).join(" ") });
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
    for (const url of createdUrls) URL.revokeObjectURL(url);
  }
};
`;

function diagnosticFromError(message: string, stack?: string): RuntimeDiagnostic {
  const location = stack?.match(/code-lab:\/\/([^\\s:)]+).*?:(\\d+):(\\d+)/m) || stack?.match(/:(\\d+):(\\d+)(?:\\)?$/m);
  if (location && location.length === 4) {
    return {
      severity: "error",
      message,
      file: location[1],
      line: Number(location[2]),
      column: Number(location[3]),
      source: "runtime",
    };
  }
  return {
    severity: "error",
    message,
    source: "runtime",
  };
}

export function runBrowserJavaScript(request: RuntimeRequest): Promise<RuntimeResult> {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    return Promise.reject(new Error("Browser runtime workers are unavailable in this environment."));
  }

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
      resolve({
        id: request.id,
        language: request.language,
        events,
        diagnostics,
        exitCode,
        durationMs: Math.round(performance.now() - started),
      });
    };

    const timer = window.setTimeout(() => {
      const diagnostic: RuntimeDiagnostic = {
        severity: "error",
        message: `Execution exceeded ${timeoutMs}ms and was terminated.`,
        source: "runtime",
      };
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

    worker.postMessage({ ...request, entryFile: request.files?.find((file) => file.path === "main.js")?.path || "main.js" });
  });
}
