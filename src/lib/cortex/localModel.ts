// src/lib/cortex/localModel.ts

import type { CortexContext } from "./types";

export const LOCAL_MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
export const LOCAL_MODEL_VRAM_MB = 1129;

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

let enginePromise: Promise<WebLLMEngine> | null = null;

function browser() {
  return typeof window !== "undefined";
}

export async function isBrowserLocalModelAvailable(): Promise<boolean> {
  if (!browser() || !("gpu" in navigator)) return false;
  try {
    const adapter = await (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu?.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

async function loadEngine(): Promise<WebLLMEngine> {
  if (!browser()) throw new Error("Browser local model is unavailable on the server.");
  if (!(await isBrowserLocalModelAvailable())) throw new Error("WebGPU is unavailable.");

  if (!enginePromise) {
    enginePromise = import("@mlc-ai/web-llm")
      .then(async ({ CreateMLCEngine }) => {
        const engine = await CreateMLCEngine(LOCAL_MODEL_ID, {
          initProgressCallback: () => {
            // Runtime/model loading progress is separate from teaching progress.
          },
        });
        return engine as unknown as WebLLMEngine;
      })
      .catch((error) => {
        enginePromise = null;
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

export async function generateBrowserLocal(
  prompt: string,
  context?: CortexContext,
  options?: { maxTokens?: number; json?: boolean }
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
