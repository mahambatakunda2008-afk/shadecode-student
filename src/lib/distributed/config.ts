export interface DistributedFeatureFlags {
  /** Master switch. Defaults to false until multi-device validation is complete. */
  enabled: boolean;
  peerDiscovery: boolean;
  peerResources: boolean;
  peerServices: boolean;
  peerCompute: boolean;
}

export const DEFAULT_DISTRIBUTED_FEATURE_FLAGS: DistributedFeatureFlags = {
  enabled: false,
  peerDiscovery: false,
  peerResources: false,
  peerServices: false,
  peerCompute: false,
};

export function resolveDistributedFeatureFlags(
  overrides: Partial<DistributedFeatureFlags> = {},
): DistributedFeatureFlags {
  const resolved = {
    ...DEFAULT_DISTRIBUTED_FEATURE_FLAGS,
    ...overrides,
  };

  // No child capability can silently bypass the master switch.
  if (!resolved.enabled) {
    return DEFAULT_DISTRIBUTED_FEATURE_FLAGS;
  }

  // Peer compute is intentionally independent but never defaults on.
  return resolved;
}
