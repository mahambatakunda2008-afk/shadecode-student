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
  /** SHA-256 of this chunk's data, not the complete resource. */
  sha256: string;
}

export interface ResourceTransferComplete {
  /** SHA-256 of the fully reassembled resource. */
  protocol: typeof SHADENET_PROTOCOL;
  requestId: string;
  resourceId: string;
  sha256: string;
}
