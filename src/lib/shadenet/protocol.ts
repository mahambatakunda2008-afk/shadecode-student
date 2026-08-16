export const SHADENET_PROTOCOL = 1 as const;

export interface ResourceRequest {
  protocol: typeof SHADENET_PROTOCOL;
  requestId: string;
  resourceId: string;
}

export interface ResourceChunk {
  protocol: typeof SHADENET_PROTOCOL;
  requestId: string;
  resourceId: string;
  index: number;
  total: number;
  data: ArrayBuffer;
  sha256: string;
}

export interface ResourceTransferComplete {
  protocol: typeof SHADENET_PROTOCOL;
  requestId: string;
  resourceId: string;
  sha256: string;
}
