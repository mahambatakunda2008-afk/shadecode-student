export type OfflineAICapability = "tutor" | "project-coach" | "study-planner" | "question-generator" | "summarizer";

export type OfflineAIStatus = "not-installed" | "available" | "limited" | "unavailable";

export interface OfflineAIProvider {
  id: string;
  model: string;
  capabilities: OfflineAICapability[];
  status(): Promise<OfflineAIStatus>;
  generate(input: { capability: OfflineAICapability; prompt: string; context?: string }): Promise<string>;
}

/**
 * Contract only: model loading belongs behind this interface so the app never
 * couples its UX to a particular on-device runtime. A future WebGPU/WASM/native
 * provider can implement it without rewriting lessons, Cortex or Project Studio.
 */
export function supportsOfflineAI(provider: OfflineAIProvider | null, capability: OfflineAICapability): boolean {
  return !!provider?.capabilities.includes(capability);
}
