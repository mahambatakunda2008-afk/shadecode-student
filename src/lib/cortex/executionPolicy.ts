/**
 * Cortex execution policy.
 *
 * Local and cloud are peers. The router chooses whether to run one lane,
 * prepare both, or race both when the local model is already warm.
 */
export type CortexExecutionPath = "deterministic-local" | "browser-local-model" | "peer-assisted" | "cloud-fallback";
export interface CortexExecutionCapabilities { online: boolean; browserModelReady: boolean; peerAvailable: boolean; cloudAvailable: boolean; }
export interface CortexExecutionDecision { primary: CortexExecutionPath; fallbacks: CortexExecutionPath[]; reason: string; }

export function chooseCortexExecutionPath(capabilities: CortexExecutionCapabilities, complexity: "simple" | "generative" | "deep"): CortexExecutionDecision {
  const fallbacks: CortexExecutionPath[] = [];
  if (capabilities.browserModelReady) {
    if (capabilities.peerAvailable) fallbacks.push("peer-assisted");
    if (capabilities.cloudAvailable && capabilities.online && complexity !== "simple") fallbacks.push("cloud-fallback");
    if (capabilities.cloudAvailable && capabilities.online && complexity !== "simple") {
      return { primary: "browser-local-model", fallbacks, reason: "Local and cloud may execute in parallel; the quality gate arbitrates the first valid result." };
    }
    return { primary: "browser-local-model", fallbacks, reason: "Use the warm browser-local model when no parallel cloud lane is useful." };
  }
  if (capabilities.peerAvailable) {
    if (capabilities.cloudAvailable && capabilities.online) fallbacks.push("cloud-fallback");
    return { primary: "peer-assisted", fallbacks, reason: "Use distributed execution before cloud generation." };
  }
  if (capabilities.cloudAvailable && capabilities.online) return { primary: "cloud-fallback", fallbacks: [], reason: "Cloud runs while local execution warms or remains unavailable." };
  return { primary: "deterministic-local", fallbacks: [], reason: "Remain useful offline with deterministic Cortex intelligence." };
}