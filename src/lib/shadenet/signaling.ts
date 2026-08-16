export interface SignalSession {
  sessionId: string;
  peerId: string;
  expiresAt: number;
}

export interface SignalMessage {
  sessionId: string;
  fromPeerId: string;
  toPeerId: string;
  type: "offer" | "answer" | "ice" | "close";
  payload: unknown;
  expiresAt: number;
}

export interface SignalingTransport {
  publish(message: SignalMessage): Promise<void>;
  subscribe(peerId: string, handler: (message: SignalMessage) => void): () => void;
}

export function isSignalValid(message: SignalMessage, now = Date.now()): boolean {
  return message.expiresAt > now && message.fromPeerId !== message.toPeerId && message.sessionId.length > 0;
}

export function createSignalSession(peerId: string, ttlMs = 60_000, now = Date.now()): SignalSession {
  if (!peerId) throw new Error("peerId is required");
  return {
    sessionId: `${peerId}:${now}:${Math.random().toString(36).slice(2)}`,
    peerId,
    expiresAt: now + ttlMs,
  };
}
