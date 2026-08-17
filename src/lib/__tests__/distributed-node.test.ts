import { describe, expect, it } from 'vitest';
import {
  canAcceptWorkload,
  chooseExecutionTarget,
  scoreNode,
  type DistributedWorkload,
  type NodeCapabilities,
  type WorkloadPolicy,
} from '../distributed/node';

const policy: WorkloadPolicy = {
  allowPeerCompute: true,
  allowGpu: true,
  allowNpu: true,
  allowCellular: false,
  chargingOnly: false,
  maxCpuPercent: 80,
  maxStorageMb: 512,
  maxBandwidthMb: 100,
};

const workload: DistributedWorkload = {
  workloadId: 'w1',
  type: 'inference',
  modelId: 'small-model',
  estimatedMemoryMb: 512,
  requiresGpu: false,
  requiresNpu: false,
  networkRequired: true,
  privacy: 'shareable',
  maxRuntimeMs: 5000,
};

const node: NodeCapabilities = {
  nodeId: 'n1',
  kind: 'desktop',
  cpuClass: 3,
  gpuClass: 2,
  npuClass: 0,
  memoryClassMb: 4096,
  storageQuotaMb: 512,
  network: 'wifi',
  batteryPolicy: 'unrestricted',
  modelIds: ['small-model'],
  trust: 'trusted',
  lastSeenAt: Date.now(),
};

describe('distributed node policy', () => {
  it('rejects unknown and revoked nodes', () => {
    expect(canAcceptWorkload({ ...node, trust: 'unknown' }, workload, policy)).toBe(false);
    expect(canAcceptWorkload({ ...node, trust: 'revoked' }, workload, policy)).toBe(false);
  });

  it('rejects metered execution when cellular contribution is disabled', () => {
    expect(canAcceptWorkload({ ...node, network: 'metered' }, workload, policy)).toBe(false);
  });

  it('never sends private work to an untrusted peer or cloud', () => {
    expect(chooseExecutionTarget(
      { ...workload, privacy: 'private' },
      {
        localModelAvailable: false,
        localModelQuality: 0,
        localBatteryPercent: 100,
        localNetwork: 'wifi',
        externalCost: 0,
        urgency: 'normal',
      },
      [node],
      policy,
    )).toBe('unavailable');
  });

  it('prefers a trusted peer for shareable work when local inference is weak', () => {
    expect(chooseExecutionTarget(
      workload,
      {
        localModelAvailable: true,
        localModelQuality: 0.4,
        localBatteryPercent: 80,
        localNetwork: 'wifi',
        externalCost: 1,
        urgency: 'normal',
      },
      [node],
      policy,
    )).toBe('personal-peer');
  });

  it('falls back to cloud only for explicitly shareable work', () => {
    expect(chooseExecutionTarget(
      workload,
      {
        localModelAvailable: false,
        localModelQuality: 0,
        localBatteryPercent: 10,
        localNetwork: 'wifi',
        externalCost: 1,
        urgency: 'normal',
      },
      [],
      policy,
    )).toBe('cloud');
  });

  it('gives trusted capable nodes a finite positive score', () => {
    const score = scoreNode(node, workload);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});
