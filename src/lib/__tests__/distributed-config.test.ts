import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISTRIBUTED_FEATURE_FLAGS,
  resolveDistributedFeatureFlags,
} from '../distributed/config';

describe('distributed feature gates', () => {
  it('keeps every distributed capability disabled by default', () => {
    expect(DEFAULT_DISTRIBUTED_FEATURE_FLAGS).toEqual({
      enabled: false,
      peerDiscovery: false,
      peerResources: false,
      peerServices: false,
      peerCompute: false,
    });
  });

  it('prevents child flags from bypassing the master switch', () => {
    expect(resolveDistributedFeatureFlags({ peerResources: true })).toEqual(
      DEFAULT_DISTRIBUTED_FEATURE_FLAGS,
    );
  });

  it('allows explicit staged enablement without enabling compute', () => {
    expect(resolveDistributedFeatureFlags({ enabled: true, peerResources: true })).toEqual({
      enabled: true,
      peerDiscovery: false,
      peerResources: true,
      peerServices: false,
      peerCompute: false,
    });
  });
});
