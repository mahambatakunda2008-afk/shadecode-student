import { getCapability, type CapabilityAvailability, type CapabilityContract, type CapabilityId } from "@/lib/platform/capabilities";

export interface CapabilityObservation {
  id: CapabilityId;
  availability: CapabilityAvailability;
  source: "browser" | "native" | "remote" | "edge" | "cloud" | "policy";
  details?: Record<string, unknown>;
}

export interface CapabilityResolution {
  requested: CapabilityId;
  selected: CapabilityId | null;
  contract: CapabilityContract | null;
  reason: string;
}

export function resolveCapability(requested: CapabilityId, observations: CapabilityObservation[] = []): CapabilityResolution {
  const contract = getCapability(requested) ?? null;
  if (!contract) return { requested, selected: null, contract: null, reason: "Unknown capability." };

  const observed = observations.find((item) => item.id === requested);
  if (observed?.availability === "available") {
    return { requested, selected: requested, contract, reason: `Capability available via ${observed.source}.` };
  }

  for (const fallbackId of contract.fallbackIds ?? []) {
    const fallback = getCapability(fallbackId);
    const fallbackObservation = observations.find((item) => item.id === fallbackId);
    if (fallback && fallbackObservation?.availability === "available") {
      return { requested, selected: fallbackId, contract: fallback, reason: `Using declared fallback ${fallbackId}.` };
    }
  }

  return {
    requested,
    selected: null,
    contract,
    reason: observed ? `Capability is ${observed.availability}.` : `Capability requires ${contract.platforms.join(", ")}.`,
  };
}

export function observeBrowserCapabilities(): CapabilityObservation[] {
  if (typeof window === "undefined") return [];
  const observations: CapabilityObservation[] = [];
  if (typeof Worker !== "undefined") observations.push({ id: "runtime.javascript", availability: "available", source: "browser" });
  if (typeof navigator.mediaDevices?.getUserMedia === "function") {
    observations.push({ id: "device.camera", availability: "permission-required", source: "browser" });
    observations.push({ id: "device.microphone", availability: "permission-required", source: "browser" });
  }
  if ("Notification" in window) observations.push({ id: "device.notifications", availability: "permission-required", source: "browser" });
  return observations;
}
