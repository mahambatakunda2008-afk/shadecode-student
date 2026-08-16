import type { PeerHello, ResourceChunk, ResourceRequest } from "./protocol";

export interface ShadeNetPeer {
  send(message: PeerHello | ResourceRequest | ResourceChunk): void;
  close(): void;
}

/**
 * Browser-native transport. Signaling is intentionally supplied by the
 * caller, keeping ShadeNet independent of Supabase or any particular server.
 */
export function createPeerConnection(config?: RTCConfiguration): RTCPeerConnection {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("WebRTC is not available in this environment");
  }
  return new RTCPeerConnection(config);
}

export function openDataChannel(connection: RTCPeerConnection, label = "shadenet-v1"): RTCDataChannel {
  const channel = connection.createDataChannel(label, { ordered: true });
  channel.binaryType = "arraybuffer";
  return channel;
}
