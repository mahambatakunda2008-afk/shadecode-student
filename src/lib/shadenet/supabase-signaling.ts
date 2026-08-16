import { createClient } from "@/lib/supabase/client";
import type { SignalMessage, SignalingTransport } from "./signaling";

/**
 * Supabase is used only as a short-lived WebRTC rendezvous channel.
 * Resource bytes never pass through this transport.
 */
export class SupabaseSignalingTransport implements SignalingTransport {
  private readonly client = createClient();
  private readonly channel = this.client.channel("shadenet-signaling", {
    config: { broadcast: { self: false } },
  });
  private subscribed = false;

  async publish(message: SignalMessage): Promise<void> {
    await this.ensureSubscribed();
    await this.channel.send({ type: "broadcast", event: "signal", payload: message });
  }

  subscribe(peerId: string, handler: (message: SignalMessage) => void): () => void {
    void this.ensureSubscribed().then(() => {
      this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        const message = payload as SignalMessage;
        if (message.toPeerId === peerId && message.expiresAt > Date.now()) handler(message);
      });
    });
    return () => {
      this.channel.unsubscribe();
      this.subscribed = false;
    };
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return;
    // RealtimeChannel.subscribe() is callback-based (returns the channel
    // itself for chaining, not a Promise) -- wrap it rather than await
    // the return value directly, which type-checked incorrectly.
    const status = await new Promise<string>((resolve) => {
      this.channel.subscribe((status) => resolve(status));
    });
    if (status !== "SUBSCRIBED") throw new Error(`ShadeNet signaling unavailable: ${status}`);
    this.subscribed = true;
  }
}
