export type ResourceVisibility = "private" | "peer" | "public";

export interface ResourcePolicy {
  visibility: ResourceVisibility;
  allowMeteredNetwork: boolean;
  allowBatterySharing: boolean;
  maxCacheBytes: number;
  allowReplication: boolean;
}

export const DEFAULT_RESOURCE_POLICY: ResourcePolicy = {
  visibility: "private",
  allowMeteredNetwork: false,
  allowBatterySharing: false,
  maxCacheBytes: 256 * 1024 * 1024,
  allowReplication: false,
};

export function canShare(policy: ResourcePolicy, requestedVisibility: ResourceVisibility): boolean {
  if (policy.visibility === "private") return false;
  if (requestedVisibility === "public" && policy.visibility !== "public") return false;
  return requestedVisibility === policy.visibility || policy.visibility === "public";
}

export function canReplicate(policy: ResourcePolicy, bytes: number, metered: boolean, batteryLow: boolean): boolean {
  if (!policy.allowReplication || bytes > policy.maxCacheBytes) return false;
  if (metered && !policy.allowMeteredNetwork) return false;
  if (batteryLow && !policy.allowBatterySharing) return false;
  return true;
}
