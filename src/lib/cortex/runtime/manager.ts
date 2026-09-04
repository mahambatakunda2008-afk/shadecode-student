import type {
  CortexGenerationInput,
  CortexRuntime,
  CortexRuntimeKind,
} from "./types";

export interface CortexRuntimeSelection {
  runtime: CortexRuntime | null;
  reason: "local-ready" | "local-unavailable" | "no-runtime";
}

/**
 * Runtime selection is intentionally explicit. Local inference always wins
 * when a ready local runtime is registered. Cloud is a fallback, never an
 * implicit replacement for local capability.
 */
export class CortexRuntimeManager {
  private runtimes = new Map<CortexRuntimeKind, CortexRuntime>();

  register(runtime: CortexRuntime): void {
    this.runtimes.set(runtime.kind, runtime);
  }

  unregister(kind: CortexRuntimeKind): void {
    this.runtimes.delete(kind);
  }

  get(kind: CortexRuntimeKind): CortexRuntime | null {
    return this.runtimes.get(kind) ?? null;
  }

  async select(preferLocal = true): Promise<CortexRuntimeSelection> {
    if (preferLocal) {
      const local = this.runtimes.get("local-web") ?? this.runtimes.get("local-native");
      if (local && await local.isReady()) {
        return { runtime: local, reason: "local-ready" };
      }
      if (this.runtimes.has("local-web") || this.runtimes.has("local-native")) {
        return { runtime: null, reason: "local-unavailable" };
      }
    }

    const cloud = this.runtimes.get("cloud");
    if (cloud && await cloud.isReady()) {
      return { runtime: cloud, reason: "local-unavailable" };
    }

    return { runtime: null, reason: "no-runtime" };
  }

  async generate(input: CortexGenerationInput, preferLocal = true): Promise<string> {
    const selection = await this.select(preferLocal);
    if (!selection.runtime) {
      throw new Error(
        selection.reason === "local-unavailable"
          ? "Local Cortex is not ready on this device."
          : "No Cortex runtime is available.",
      );
    }
    return selection.runtime.generate(input);
  }
}

export const cortexRuntimeManager = new CortexRuntimeManager();
