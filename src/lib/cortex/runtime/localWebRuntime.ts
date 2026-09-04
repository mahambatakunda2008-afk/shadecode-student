import type {
  CortexCapabilities,
  CortexGenerationChunk,
  CortexGenerationInput,
  CortexRuntime,
} from "./types";
import { getCortexDeviceCapabilities } from "./capabilities";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

type WorkerResponse =
  | { type: "status"; requestId: string; status: "loading" | "generating" | "ready"; progress: number }
  | { type: "chunk"; requestId: string; text: string }
  | { type: "complete"; requestId: string; text: string; progress: number }
  | { type: "error"; requestId: string; message: string };

function makeId() {
  return `cortex-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Browser-local inference runtime.
 *
 * The worker keeps model execution off the React/UI thread. Transformers.js
 * is loaded from its official ESM CDN entrypoint so this adapter can land
 * without bloating the Next.js server bundle. Once the model has been warmed
 * and cached, Transformers.js can reuse its browser cache for later sessions.
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
    const device = getCortexDeviceCapabilities();
    return {
      textGeneration: device.wasm || device.webgpu,
      streaming: true,
      offline: true,
      webgpu: device.webgpu,
      wasm: device.wasm,
    };
  }

  async isReady(): Promise<boolean> {
    if (typeof window === "undefined" || typeof Worker === "undefined") return false;
    const capabilities = getCortexDeviceCapabilities();
    return capabilities.wasm || capabilities.webgpu;
  }

  async warm(): Promise<void> {
    if (this.warmPromise) return this.warmPromise;
    this.warmPromise = new Promise<void>((resolve, reject) => {
      const worker = this.ensureWorker();
      const requestId = makeId();
      const device = getCortexDeviceCapabilities().webgpu ? "webgpu" : "wasm";
      const dtype = device === "webgpu" ? "q4" : "q4";
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Local Cortex model warm-up timed out."));
      }, REQUEST_TIMEOUT_MS);

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "status" && event.data.status === "ready") {
          cleanup();
          resolve();
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
    const worker = this.ensureWorker();
    const requestId = makeId();
    const device = getCortexDeviceCapabilities().webgpu ? "webgpu" : "wasm";
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
}

export const localWebCortexRuntime = new LocalWebCortexRuntime();
