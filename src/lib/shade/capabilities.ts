import { getCapability, type CapabilityAvailability, type CapabilityContract, type CapabilityId } from "@/lib/platform/capabilities";

export type ShadeCapabilityObservation = {
  id: CapabilityId;
  availability: CapabilityAvailability;
  source: "browser" | "native" | "remote" | "edge" | "cloud" | "policy";
  details?: Record<string, unknown>;
};

export type ShadeCapabilityResolution = {
  requested: string;
  capability: CapabilityId | null;
  contract: CapabilityContract | null;
  allowed: boolean;
  reason: string;
};

const isCapabilityId = (value: string): value is CapabilityId => Boolean(getCapability(value as CapabilityId));

/**
 * Resolve declared Shade requirements against observed platform capabilities.
 * This is policy resolution, not permission granting. A caller must still
 * obtain user/native authorization before executing a sensitive capability.
 */
export function resolveShadeCapability(requested: string, observations: ShadeCapabilityObservation[] = []): ShadeCapabilityResolution {
  if (!isCapabilityId(requested)) {
    return { requested, capability: null, contract: null, allowed: false, reason: "Shade declared an unknown capability." };
  }

  const contract = getCapability(requested);
  if (!contract) return { requested, capability: null, contract: null, allowed: false, reason: "Capability contract is missing." };

  const observation = observations.find((item) => item.id === requested);
  if (observation?.availability === "available") {
    return { requested, capability: requested, contract, allowed: true, reason: `Available via ${observation.source}.` };
  }

  if (contract.availability === "available" && !observation) {
    return { requested, capability: requested, contract, allowed: true, reason: "Available by platform contract." };
  }

  return {
    requested,
    capability: requested,
    contract,
    allowed: false,
    reason: observation ? `Capability is ${observation.availability}.` : `Capability requires explicit support on ${contract.platforms.join(", ")}.`,
  };
}

export function resolveShadeRequirements(requirements: string[], observations: ShadeCapabilityObservation[] = []) {
  return requirements.map((requested) => resolveShadeCapability(requested, observations));
}

export function summarizeShadeCapabilities(requirements: string[], observations: ShadeCapabilityObservation[] = []) {
  const resolutions = resolveShadeRequirements(requirements, observations);
  return {
    requested: resolutions.length,
    allowed: resolutions.filter((resolution) => resolution.allowed).length,
    blocked: resolutions.filter((resolution) => !resolution.allowed).length,
    resolutions,
  };
}
