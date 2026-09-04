import type {
  CortexCapabilities,
  CortexGenerationChunk,
  CortexGenerationInput,
  CortexRuntime,
} from "./types";
import { getCortexDeviceProfile } from "./capabilities";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
export const LOCAL_CORTEX_READY_KEY = "shadecode:cortex:local-model-ready:v1";
export const LOCAL_CORTEX_RUNTIME_EVENT = "shadecode:cortex:local-runtime";
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

type WorkerResponse =
  | { type: "status"; requestId: string; status: "loading" | "generating" | "ready"; progress: number }
  | { type: "chunk"; requestId: string; text: string }
  | { type: "complete"; requestId: string; text: string; progress: number }
  | { type: "error"; requestId: string; message: string };

function makeId() {
  return `cortex-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dispatchRuntimeEvent(detail: "ready" | "reset") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_CORTEX_RUNTIME_EVENT, { detail }));
}

export function isLocalCortexPrepared(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LOCAL_CORTEX_READY_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Browser-local inference runtime.
 *
 * The worker keeps model execution off the React/UI thread. Transformers.js
 * is loaded from its official ESM CDN entrypoint. The model is cached by
 * Transformers.js after preparation so later sessions can generate offline.
 */
export class LocalWebCortexRuntime implements CortexRuntime {
  readonly id = "cortex-local-web-qwen25-0.5b";
  readonly kind = "local-web" as const;

  private worker: Worker | null = null;
  private warmPromise: Promise<void> | null = null;

  private ensureWorker() {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      throw new Error("Local Cortex requires a browser worker runtime.");
    }
    if (!this.worker) {
      this.worker = new Worker(new URL("./localWebRuntime.worker.ts", import.meta.url));
    }
    return this.worker;
  }

  async capabilities(): Promise<CortexCapabilities> {
    const device = getCortexDeviceProfile();
    return {
      textGeneration: device.wasm || device.webgpu,
      streaming: true,
      offline: isLocalCortexPrepared(),
      webgpu: device.webgpu,
      wasm: device.wasm,
    };
  }

  async isReady(): Promise<boolean> {
    if (typeof window === "undefined" || typeof Worker === "undefined") return false;
    const capabilities = getCortexDeviceProfile();
    return (capabilities.wasm || capabilities.webgpu) && isLocalCortexPrepared();
  }

  async warm(onProgress?: (progress: number) => void): Promise<void> {
    if (isLocalCortexPrepared()) {
      onProgress?.(100);
      return;
    }
    if (this.warmPromise) return this.warmPromise;
    this.warmPromise = new Promise<void>((resolve, reject) => {
      const worker = this.ensureWorker();
      const requestId = makeId();
      const device = getCortexDeviceProfile().webgpu ? "webgpu" : "wasm";
      const dtype = "q4";
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Local Cortex model preparation timed out."));
      }, REQUEST_TIMEOUT_MS);

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "status") {
          onProgress?.(Math.max(0, Math.min(100, event.data.progress)));
          if (event.data.status === "ready") {
            try {
              localStorage.setItem(LOCAL_CORTEX_READY_KEY, "1");
            } catch {
              cleanup();
              reject(new Error("Local Cortex is ready, but this browser blocked persistent model state."));
              return;
            }
            cleanup();
            dispatchRuntimeEvent("ready");
            resolve();
          }
        } else if (event.data.type === "error") {
          cleanup();
          reject(new Error(event.data.message));
        }
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
      };

      worker.addEventListener("message", onMessage);
      onProgress?.(1);
      worker.postMessage({ type: "warm", requestId, model: MODEL, dtype, device });
    }).finally(() => {
      this.warmPromise = null;
    });

    return this.warmPromise;
  }

  async generate(input: CortexGenerationInput): Promise<string> {
    let output = "";
    await this.stream(input, (chunk) => {
      output += chunk.text;
    });
    return output;
  }

  async stream(
    input: CortexGenerationInput,
    onChunk: (chunk: CortexGenerationChunk) => void,
  ): Promise<void> {
    if (!(await this.isReady())) {
      await this.warm();
    }
    const worker = this.ensureWorker();
    const requestId = makeId();
    const device = getCortexDeviceProfile().webgpu ? "webgpu" : "wasm";
    const dtype = "q4";

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Local Cortex generation timed out."));
      }, REQUEST_TIMEOUT_MS);

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.requestId !== requestId) return;
        if (message.type === "chunk") {
          onChunk({ text: message.text, done: false });
        } else if (message.type === "complete") {
          cleanup();
          onChunk({ text: "", done: true });
          resolve();
        } else if (message.type === "error") {
          cleanup();
          reject(new Error(message.message));
        }
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Local Cortex generation was cancelled.", "AbortError"));
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        input.signal?.removeEventListener("abort", onAbort);
      };

      worker.addEventListener("message", onMessage);
      input.signal?.addEventListener("abort", onAbort, { once: true });
      worker.postMessage({
        type: "generate",
        requestId,
        prompt: input.prompt,
        system: input.system,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
        model: MODEL,
        dtype,
        device,
      });
    });
  }

  async dispose(): Promise<void> {
    this.worker?.terminate();
    this.worker = null;
  }

  resetPreparedState(): void {
    try {
      localStorage.removeItem(LOCAL_CORTEX_READY_KEY);
    } catch {
      // Best effort only.
    }
    dispatchRuntimeEvent("reset");
  }
}

export const localWebCortexRuntime = new LocalWebCortexRuntime();
