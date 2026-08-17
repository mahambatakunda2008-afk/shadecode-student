export type NodeKind = 'browser' | 'android' | 'desktop' | 'institution' | 'edge';
export type NetworkClass = 'offline' | 'metered' | 'wifi' | 'ethernet';
export type BatteryPolicy = 'never' | 'charging-only' | 'unrestricted';
export type TrustLevel = 'unknown' | 'paired' | 'trusted' | 'revoked';

export interface NodeCapabilities {
  nodeId: string;
  kind: NodeKind;
  cpuClass: 0 | 1 | 2 | 3;
  gpuClass: 0 | 1 | 2 | 3;
  npuClass: 0 | 1 | 2 | 3;
  memoryClassMb: number;
  storageQuotaMb: number;
  network: NetworkClass;
  batteryPolicy: BatteryPolicy;
  modelIds: string[];
  trust: TrustLevel;
  lastSeenAt: number;
}

export interface WorkloadPolicy {
  allowPeerCompute: boolean;
  allowGpu: boolean;
  allowNpu: boolean;
  allowCellular: boolean;
  chargingOnly: boolean;
  maxCpuPercent: number;
  maxStorageMb: number;
  maxBandwidthMb: number;
}

export interface DistributedWorkload {
  workloadId: string;
  type: 'inference' | 'index' | 'ocr' | 'transform' | 'validate';
  modelId?: string;
  estimatedMemoryMb: number;
  requiresGpu: boolean;
  requiresNpu: boolean;
  networkRequired: boolean;
  privacy: 'private' | 'paired-only' | 'shareable';
  maxRuntimeMs: number;
}

export interface RoutingContext {
  localModelAvailable: boolean;
  localModelQuality: number;
  localBatteryPercent: number;
  localNetwork: NetworkClass;
  externalCost: number;
  urgency: 'low' | 'normal' | 'high';
}

export type ExecutionTarget = 'local' | 'personal-peer' | 'shade-net' | 'edge' | 'cloud' | 'unavailable';

const networkPenalty: Record<NetworkClass, number> = {
  offline: 100,
  metered: 35,
  wifi: 10,
  ethernet: 0,
};

/** Conservative admission control for a node that may execute peer work. */
export function canAcceptWorkload(
  node: NodeCapabilities,
  workload: DistributedWorkload,
  policy: WorkloadPolicy,
): boolean {
  if (node.trust === 'revoked' || node.trust === 'unknown') return false;
  if (!policy.allowPeerCompute) return false;
  if (workload.estimatedMemoryMb > node.memoryClassMb) return false;
  if (workload.requiresGpu && (!policy.allowGpu || node.gpuClass === 0)) return false;
  if (workload.requiresNpu && (!policy.allowNpu || node.npuClass === 0)) return false;
  if (workload.networkRequired && node.network === 'offline') return false;
  if (node.storageQuotaMb < 0 || policy.maxStorageMb < 0) return false;
  if (policy.maxCpuPercent < 0 || policy.maxCpuPercent > 100) return false;
  if (policy.maxBandwidthMb < 0) return false;
  if (node.network === 'metered' && !policy.allowCellular) return false;
  if (policy.chargingOnly && node.batteryPolicy !== 'charging-only') return false;
  return true;
}

export function chooseExecutionTarget(
  workload: DistributedWorkload,
  context: RoutingContext,
  candidates: NodeCapabilities[],
  policy: WorkloadPolicy,
): ExecutionTarget {
  if (context.localModelAvailable && context.localModelQuality >= 0.7) {
    if (workload.privacy === 'private' || context.localBatteryPercent >= 30 || context.urgency === 'high') {
      return 'local';
    }
  }

  // Private data must never silently fall back to an untrusted peer or cloud.
  if (workload.privacy === 'private') {
    return 'unavailable';
  }

  const viable = candidates.filter((node) => canAcceptWorkload(node, workload, policy));
  if (viable.length > 0 && context.localNetwork !== 'offline') {
    const trustedPersonal = viable.find((node) => node.trust === 'trusted');
    if (trustedPersonal) return 'personal-peer';
    const paired = viable.find((node) => node.trust === 'paired');
    if (paired && workload.privacy !== 'shareable') return 'personal-peer';
    if (paired) return 'shade-net';
    return 'edge';
  }

  if (context.localNetwork === 'offline') {
    return context.localModelAvailable ? 'local' : 'unavailable';
  }

  // Cloud is permitted only for workloads explicitly marked shareable.
  return workload.privacy === 'shareable' ? 'cloud' : 'unavailable';
}

export function scoreNode(node: NodeCapabilities, workload: DistributedWorkload): number {
  if (!canAcceptWorkload(node, workload, {
    allowPeerCompute: true,
    allowGpu: true,
    allowNpu: true,
    allowCellular: false,
    chargingOnly: false,
    maxCpuPercent: 100,
    maxStorageMb: node.storageQuotaMb,
    maxBandwidthMb: Number.MAX_SAFE_INTEGER,
  })) return Number.NEGATIVE_INFINITY;

  const trust = node.trust === 'trusted' ? 40 : node.trust === 'paired' ? 20 : 0;
  const accelerator = (workload.requiresGpu ? node.gpuClass * 10 : 0)
    + (workload.requiresNpu ? node.npuClass * 10 : 0);
  const memory = Math.min(node.memoryClassMb / Math.max(workload.estimatedMemoryMb, 1), 10);
  const network = networkPenalty[node.network];
  return trust + accelerator + memory - network;
}
