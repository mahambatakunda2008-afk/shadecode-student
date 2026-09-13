import type { CapabilityId } from "@/lib/platform/capabilities";

export const NATIVE_BRIDGE_VERSION = 1 as const;

export type NativeBridgeOperation =
  | "handshake"
  | "capabilities"
  | "execute"
  | "files"
  | "speech"
  | "ocr"
  | "local-ai"
  | "notify";

export interface NativeBridgeRequest {
  id: string;
  version: typeof NATIVE_BRIDGE_VERSION;
  operation: NativeBridgeOperation;
  capability?: CapabilityId;
  payload: Record<string, unknown>;
}

export interface NativeBridgeEvent {
  id: string;
  type: "status" | "stdout" | "stderr" | "diagnostic" | "result" | "error";
  payload: Record<string, unknown>;
}

export interface NativeBridgeResponse {
  id: string;
  version: typeof NATIVE_BRIDGE_VERSION;
  ok: boolean;
  events: NativeBridgeEvent[];
  capabilities?: CapabilityId[];
  error?: { code: string; message: string };
}

export interface NativeBridgeTransport {
  request(request: NativeBridgeRequest): Promise<NativeBridgeResponse>;
}

export function createNativeBridgeRequest(
  operation: NativeBridgeOperation,
  payload: Record<string, unknown> = {},
  capability?: CapabilityId,
): NativeBridgeRequest {
  return {
    id: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version: NATIVE_BRIDGE_VERSION,
    operation,
    capability,
    payload,
  };
}

export function isCompatibleNativeBridge(response: NativeBridgeResponse): boolean {
  return response.version === NATIVE_BRIDGE_VERSION;
}
