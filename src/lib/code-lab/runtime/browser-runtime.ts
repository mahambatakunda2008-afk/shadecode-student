import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";

type WorkerMessage =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string; diagnostic?: RuntimeDiagnostic };

const WORKER_SOURCE = `
self.onmessage = async (event) => {
  const request = event.data;
  const emit = (message) => self.postMessage(message);
  emit({ type: "status", status: "running" });
  const originalLog = console.log;
  const originalError = console.error;
  const write = (type, values) => emit({ type, text: values.map((value) => {
    try { return typeof value === "string" ? value : JSON.stringify(value); }
    catch { return String(value); }
  }).join(" ") });
  console.log = (...values) => write("stdout", values);
  console.error = (...values) => write("stderr", values);
  try {
    const run = new Function(request.code);
    run();
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
  const location = stack?.match(/:(\\d+):(\\d+)(?:\\)?$/m);
  return {
    severity: "error",
    message,
    line: location ? Number(location[1]) : undefined,
    column: location ? Number(location[2]) : undefined,
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
      const diagnostic: RuntimeDiagnostic = { severity: "error", message: `Execution exceeded ${timeoutMs}ms and was terminated.`, source: "runtime" };
      diagnostics.push(diagnostic);
      events.push({ type: "status", status: "timed_out" });
      events.push({ type: "error", message: diagnostic.message, diagnostic });
      finish(null);
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<WorkerMessage & { stack?: string }>) => {
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
