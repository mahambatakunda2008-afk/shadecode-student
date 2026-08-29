import type { OfflineAICapability, OfflineAIProvider } from "./aiCapability";

export type IntelligenceMode = "offline-deterministic" | "offline-model" | "online-model";

export type IntelligenceRequest = {
  capability: OfflineAICapability;
  prompt: string;
  context?: string;
  allowOnline?: boolean;
};

export type IntelligenceResponse = {
  text: string;
  mode: IntelligenceMode;
};

export type DeterministicHandler = (request: IntelligenceRequest) => string | null;

export class OfflineIntelligenceRuntime {
  constructor(
    private readonly deterministicHandlers: Partial<Record<OfflineAICapability, DeterministicHandler>> = {},
    private readonly offlineProvider: OfflineAIProvider | null = null,
    private readonly onlineProvider: OfflineAIProvider | null = null,
  ) {}

  async run(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const deterministic = this.deterministicHandlers[request.capability]?.(request);
    if (deterministic) return { text: deterministic, mode: "offline-deterministic" };

    if (this.offlineProvider && this.offlineProvider.capabilities.includes(request.capability)) {
      const status = await this.offlineProvider.status();
      if (status === "available" || status === "limited") {
        return { text: await this.offlineProvider.generate(request), mode: "offline-model" };
      }
    }

    if (request.allowOnline !== false && this.onlineProvider && this.onlineProvider.capabilities.includes(request.capability)) {
      return { text: await this.onlineProvider.generate(request), mode: "online-model" };
    }

    throw new Error(`No intelligence provider available for ${request.capability}`);
  }
}
