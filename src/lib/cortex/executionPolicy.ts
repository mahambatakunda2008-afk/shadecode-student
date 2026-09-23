/**
 * Cortex execution policy.
 *
 * Local-first: Vercel is delivery/control-plane infrastructure, not the brain.
 */
export type CortexExecutionPath = "deterministic-local" | "browser-local-model" | "peer-assisted" | "cloud-fallback";
export interface CortexExecutionCapabilities { online: boolean; browserModelReady: boolean; peerAvailable: boolean; cloudAvailable: boolean; }
export interface CortexExecutionDecision { primary: CortexExecutionPath; fallbacks: CortexExecutionPath[]; reason: string; }

export function chooseCortexExecutionPath(capabilities: CortexExecutionCapabilities, complexity: "simple" | "generative" | "deep"): CortexExecutionDecision {
  const fallbacks: CortexExecutionPath[] = [];
  if (capabilities.browserModelReady) {
    if (capabilities.peerAvailable) fallbacks.push("peer-assisted");
    if (capabilities.cloudAvailable && capabilities.online) fallbacks.push("cloud-fallback");
    return { primary: "browser-local-model", fallbacks, reason: "Run generative work on-device when a real local model is ready." };
  }
  if (capabilities.peerAvailable) {
    if (capabilities.cloudAvailable && capabilities.online) fallbacks.push("cloud-fallback");
    return { primary: "peer-assisted", fallbacks, reason: "Use distributed execution before cloud generation." };
  }
  if (capabilities.cloudAvailable && capabilities.online) return { primary: "cloud-fallback", fallbacks: [], reason: "Cloud is fallback because no local execution path is ready." };
  return { primary: "deterministic-local", fallbacks: [], reason: "Remain useful offline with deterministic Cortex intelligence." };
}