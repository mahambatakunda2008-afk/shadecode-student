import type { RuntimeRequest, RuntimeResult } from "./types";

type WorkerMessage =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string };

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
    emit({ type: "stderr", text: error instanceof Error ? error.stack || error.message : String(error) });
    emit({ type: "status", status: "failed" });
    emit({ type: "exit", code: 1 });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};
`;

export function runBrowserJavaScript(request: RuntimeRequest): Promise<RuntimeResult> {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    return Promise.reject(new Error("Browser runtime workers are unavailable in this environment."));
  }

  const started = performance.now();
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 5000, 250), 15000);
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  return new Promise((resolve) => {
    const events: RuntimeResult["events"] = [];
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
        exitCode,
        durationMs: Math.round(performance.now() - started),
      });
    };

    const blobUrl = URL.createObjectURL(blob);
    const timer = window.setTimeout(() => {
      events.push({ type: "status", status: "timed_out" });
      events.push({ type: "error", message: `Execution exceeded ${timeoutMs}ms and was terminated.` });
      finish(null);
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      events.push(event.data);
      if (event.data.type === "exit") finish(event.data.code);
    };

    worker.onerror = (event) => {
      events.push({ type: "error", message: event.message || "The runtime worker failed." });
      events.push({ type: "status", status: "failed" });
      finish(1);
    };

    worker.postMessage(request);
  });
}
