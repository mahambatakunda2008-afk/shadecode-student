"use client";

import { generateBrowserLocal, getBrowserLocalModelStatus } from "@/lib/cortex/localModel";
import { firstSuccessful } from "@/lib/cortex/hybridRuntime";
import { assertCortexObject, parseCortexJson } from "@/lib/cortex/outputContract";

export interface HybridJsonRequest<T> {
  localPrompt: string;
  cloud: (signal: AbortSignal) => Promise<T>;
  validate: (value: unknown) => value is T;
  localMaxTokens?: number;
  preferParallel?: boolean;
  repair?: (value: unknown, failure: unknown) => Promise<T>;
}

async function runLocal<T>(request: HybridJsonRequest<T>, validate: (value: unknown) => value is T): Promise<T> {
  const raw = await generateBrowserLocal(request.localPrompt, undefined, {
    maxTokens: request.localMaxTokens ?? 1800,
    json: true,
  });
  const parsed = parseCortexJson(raw);
  assertCortexObject(parsed);
  if (!validate(parsed)) throw new Error("Browser-local Cortex output failed domain validation.");
  return parsed;
}

/**
 * Shared hybrid executor. A warm local model may race cloud. Invalid output can
 * be repaired by the domain engine, while the caller still owns side effects.
 */
export async function runHybridJson<T>(request: HybridJsonRequest<T>): Promise<T> {
  const status = typeof navigator !== "undefined" ? getBrowserLocalModelStatus().status : "unsupported";
  const localReady = status === "ready";
  const canParallel = localReady && (request.preferParallel ?? true);

  const local = () => runLocal(request, request.validate);
  const cloud = () => request.cloud(new AbortController().signal);

  if (canParallel) {
    const controller = new AbortController();
    try {
      return await firstSuccessful([
        local(),
        request.cloud(controller.signal).catch(async (error) => {
          if (request.repair) return request.repair(null, error);
          throw error;
        }),
      ]);
    } finally {
      controller.abort();
    }
  }

  try {
    return await request.cloud(new AbortController().signal);
  } catch (cloudError) {
    if (request.repair) {
      try { return await request.repair(null, cloudError); } catch {}
    }
    if (localReady) return local();
    throw cloudError;
  }
}
