"use client";

import { generateBrowserLocal, getBrowserLocalModelStatus } from "@/lib/cortex/localModel";
import { firstSuccessful } from "@/lib/cortex/hybridRuntime";

export interface HybridJsonRequest<T> {
  localPrompt: string;
  cloud: (signal: AbortSignal) => Promise<T>;
  validate: (value: unknown) => value is T;
  localMaxTokens?: number;
  preferParallel?: boolean;
}

function parseJson(value: string): unknown {
  const fenced = value.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/i);
  const candidate = fenced ? fenced[1] : value;
  try { return JSON.parse(candidate); } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch {}
    }
    return null;
  }
}

/**
 * Shared browser-side hybrid executor.
 *
 * Cloud remains the authoritative side-effect path. A warm local model may
 * race cloud for a validated result. A cold model is never downloaded merely
 * because a request arrived.
 */
export async function runHybridJson<T>(request: HybridJsonRequest<T>): Promise<T> {
  const status = typeof navigator !== "undefined" ? getBrowserLocalModelStatus().status : "unsupported";
  const localReady = status === "ready";
  const canParallel = localReady && (request.preferParallel ?? true);

  const local = async () => {
    if (!localReady) throw new Error("Browser-local Cortex is not warm.");
    const raw = await generateBrowserLocal(request.localPrompt, undefined, {
      maxTokens: request.localMaxTokens ?? 1800,
      json: true,
    });
    const parsed = parseJson(raw);
    if (!request.validate(parsed)) throw new Error("Browser-local Cortex output failed validation.");
    return parsed;
  };

  if (canParallel) {
    const controller = new AbortController();
    try {
      return await firstSuccessful([local(), request.cloud(controller.signal)]);
    } finally {
      controller.abort();
    }
  }

  try {
    return await request.cloud(new AbortController().signal);
  } catch (cloudError) {
    if (localReady) return local();
    throw cloudError;
  }
}
