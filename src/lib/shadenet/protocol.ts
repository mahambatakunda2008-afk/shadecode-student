export const SHADENET_PROTOCOL_VERSION = 1 as const;

export type PeerCapability = "resource-read" | "resource-write" | "p2p-transfer";

export interface PeerHello {
  protocol: typeof SHADENET_PROTOCOL_VERSION;
  deviceId: string;
  capabilities: PeerCapability[];
  resourceIds: string[];
}

export interface ResourceRequest {
  protocol: typeof SHADENET_PROTOCOL_VERSION;
  requestId: string;
  resourceId: string;
}

export interface ResourceChunk {
  protocol: typeof SHADENET_PROTOCOL_VERSION;
  requestId: string;
  resourceId: string;
  index: number;
  total: number;
  data: ArrayBuffer;
  sha256: string;
}

export interface ResourceTransferComplete {
  protocol: typeof SHADENET_PROTOCOL_VERSION;
  requestId: string;
  resourceId: string;
  sha256: string;
}
