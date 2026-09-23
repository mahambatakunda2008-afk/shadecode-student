// src/lib/cortex/localModel.ts

import type { CortexContext } from "./types";

export const LOCAL_MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
export const LOCAL_MODEL_VRAM_MB = 1129;

export type LocalModelStatus =
  | "unsupported"
  | "available"
  | "loading"
  | "ready"
  | "error";

type WebLLMEngine = {
  chat: {
    completions: {
      create(input: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: "json_object" };
      }): Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

type WebLLMModule = {
  CreateMLCEngine: (
    modelId: string,
    config?: { initProgressCallback?: (report: { progress?: number; text?: string }) => void },
  ) => Promise<WebLLMEngine>;
  CreateWebWorkerMLCEngine: (
    worker: Worker,
    modelId: string,
    config?: { initProgressCallback?: (report: { progress?: number; text?: string }) => void },
  ) => Promise<WebLLMEngine>;
};

let enginePromise: Promise<WebLLMEngine> | null = null;
let worker: Worker | null = null;
let status: LocalModelStatus = "available";
let loadProgress = 0;
const listeners = new Set<(status: LocalModelStatus, progress: number) => void>();

function browser() {
  return typeof window !== "undefined";
}

function publish(nextStatus: LocalModelStatus, progress = loadProgress) {
  status = nextStatus;
  loadProgress = Math.max(0, Math.min(100, progress));
  for (const listener of listeners) listener(status, loadProgress);
}

export function getBrowserLocalModelStatus() {
  return { status, progress: loadProgress, modelId: LOCAL_MODEL_ID };
}

export function subscribeBrowserLocalModelStatus(
  listener: (status: LocalModelStatus, progress: number) => void,
) {
  listeners.add(listener);
  listener(status, loadProgress);
  return () => listeners.delete(listener);
}

export async function isBrowserLocalModelAvailable(): Promise<boolean> {
  if (!browser() || !("gpu" in navigator)) {
    publish("unsupported", 0);
    return false;
  }

  try {
    const adapter = await (
      navigator as Navigator & {
        gpu?: { requestAdapter(): Promise<unknown> };
      }
    ).gpu?.requestAdapter();

    if (!adapter) {
      publish("unsupported", 0);
      return false;
    }

    if (status === "unsupported" || status === "error") publish("available", 0);
    return true;
  } catch {
    publish("unsupported", 0);
    return false;
  }
}

async function loadEngine(): Promise<WebLLMEngine> {
  if (!browser()) throw new Error("Browser local model is unavailable on the server.");
  if (!(await isBrowserLocalModelAvailable())) throw new Error("WebGPU is unavailable.");

  if (!enginePromise) {
    publish("loading", 0);

    enginePromise = import("@mlc-ai/web-llm")
      .then(async (webllm) => {
        const module = webllm as unknown as WebLLMModule;
        const initProgressCallback = (report: { progress?: number; text?: string }) => {
          const progress = typeof report.progress === "number" ? report.progress * 100 : loadProgress;
          publish("loading", progress);
        };

        try {
          worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
            type: "module",
          });

          const engine = await module.CreateWebWorkerMLCEngine(
            worker,
            LOCAL_MODEL_ID,
            { initProgressCallback },
          );

          publish("ready", 100);
          return engine;
        } catch (workerError) {
          worker?.terminate();
          worker = null;

          // Keep local inference available on browsers where the bundler/worker
          // path is unavailable. This fallback is still browser-local, never cloud.
          const engine = await module.CreateMLCEngine(LOCAL_MODEL_ID, {
            initProgressCallback,
          });

          publish("ready", 100);
          return engine;
        }
      })
      .catch((error) => {
        enginePromise = null;
        publish("error", 0);
        throw error;
      });
  }

  return enginePromise;
}

function contextText(context?: CortexContext) {
  const snapshot = context?.snapshot;
  const history = Array.isArray(context?.history) ? context.history.slice(-8) : [];
  return [
    snapshot ? `Learner level: ${snapshot.level ?? "unknown"}` : "",
    history.length ? `Recent learning activity: ${JSON.stringify(history)}` : "",
  ].filter(Boolean).join("\n");
}

export async function warmBrowserLocalModel(): Promise<boolean> {
  try {
    await loadEngine();
    return true;
  } catch {
    return false;
  }
}

export async function generateBrowserLocal(
  prompt: string,
  context?: CortexContext,
  options?: { maxTokens?: number; json?: boolean },
) {
  const engine = await loadEngine();
  const result = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are Cortex, an educational reasoning engine inside Shadecode Student. " +
          "Teach accurately, deeply, and step-by-step. Respect the learner's curriculum and context. " +
          "Do not invent syllabus requirements. If the requested task is too large for this local model, " +
          "return a concise structured continuation request rather than pretending the work is complete.\n" +
          contextText(context),
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.25,
    max_tokens: options?.maxTokens ?? 900,
    ...(options?.json ? { response_format: { type: "json_object" as const } } : {}),
  });

  const text = result.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Browser local model returned empty output.");
  return text;
}

export class LocalModel {
  async generate(question: string, context?: CortexContext): Promise<string> {
    return generateBrowserLocal(question, context);
  }

  async generateResponse(question: string, context?: CortexContext): Promise<string> {
    return this.generate(question, context);
  }
}
