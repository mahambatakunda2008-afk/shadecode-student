import type { NetworkClass, NodeCapabilities } from './node';

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    type?: string;
    saveData?: boolean;
  };
}

function networkClass(navigatorValue: NavigatorWithHints): NetworkClass {
  if (typeof navigatorValue.onLine === 'boolean' && !navigatorValue.onLine) return 'offline';
  const connection = navigatorValue.connection;
  if (connection?.saveData) return 'metered';
  if (connection?.type === 'ethernet') return 'ethernet';
  return 'wifi';
}

function coarseClass(value: number, thresholds: [number, number, number]): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0;
  if (value < thresholds[0]) return 1;
  if (value < thresholds[1]) return 2;
  if (value >= thresholds[2]) return 3;
  return 2;
}

export function detectBrowserCapabilities(nodeId: string): NodeCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Browser capability detection requires a browser context');
  }

  const nav = navigator as NavigatorWithHints;
  const cpuThreads = Math.max(0, nav.hardwareConcurrency || 0);
  const memoryGb = Math.max(0, nav.deviceMemory || 0);
  const network = networkClass(nav);

  // Capability detection never grants permission to contribute compute.
  // Contribution policy is a separate explicit user decision.
  return {
    nodeId,
    kind: 'browser',
    cpuClass: coarseClass(cpuThreads, [2, 4, 8]),
    gpuClass: 0,
    npuClass: 0,
    memoryClassMb: memoryGb > 0 ? Math.round(memoryGb * 1024) : 512,
    storageQuotaMb: 256,
    network,
    batteryPolicy: 'never',
    modelIds: [],
    trust: 'unknown',
    lastSeenAt: Date.now(),
  };
}
