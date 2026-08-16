import type { ResourceChunk, ResourceRequest } from "./protocol";

const MAX_MESSAGE_BYTES = 64 * 1024;

export interface WebRtcPeerOptions {
  configuration?: RTCConfiguration;
  initiator: boolean;
}

export class ShadeNetWebRtcPeer {
  readonly connection: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;

  constructor(options: WebRtcPeerOptions) {
    this.connection = new RTCPeerConnection(options.configuration);
    if (options.initiator) this.channel = this.connection.createDataChannel("shadenet", { ordered: true });
    this.connection.ondatachannel = (event) => { this.channel = event.channel; };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    return offer;
  }

  async acceptOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.connection.setRemoteDescription(offer);
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    return answer;
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.connection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.connection.addIceCandidate(candidate);
  }

  sendChunk(chunk: ResourceChunk): void {
    if (!this.channel || this.channel.readyState !== "open") throw new Error("ShadeNet data channel is not open");
    const encoded = new TextEncoder().encode(JSON.stringify({ ...chunk, data: Array.from(new Uint8Array(chunk.data)) }));
    if (encoded.byteLength > MAX_MESSAGE_BYTES) throw new Error("ShadeNet chunk exceeds transport limit");
    this.channel.send(encoded);
  }

  receive(handler: (request: ResourceRequest | ResourceChunk) => void): () => void {
    if (!this.channel) throw new Error("ShadeNet data channel is not available yet");
    const listener = (event: MessageEvent<string | ArrayBuffer>) => {
      const bytes = typeof event.data === "string" ? new TextEncoder().encode(event.data) : new Uint8Array(event.data);
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!isShadeNetMessage(parsed)) return;
      handler(parsed);
    };
    this.channel.addEventListener("message", listener);
    return () => this.channel?.removeEventListener("message", listener);
  }

  close(): void {
    this.channel?.close();
    this.connection.close();
  }
}

function isShadeNetMessage(value: unknown): value is ResourceRequest | ResourceChunk {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.protocol === 1 && typeof message.requestId === "string" && typeof message.resourceId === "string";
}
