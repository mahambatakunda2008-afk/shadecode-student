import type { ChannelResponse } from "@/lib/channels/types";
import type { StoredChannelIdentity } from "@/lib/platform/channel-identity-store";

export function buildWhatsAppResponse(identity: StoredChannelIdentity | null): ChannelResponse {
  if (!identity) {
    return {
      text: "Your WhatsApp number is not linked to a Shadecode Student account yet. Open Shadecode Student and link WhatsApp from your account settings, then send this message again.",
      metadata: { reason: "unlinked" },
    };
  }

  if (identity.status !== "active") {
    return {
      text: "This Shadecode WhatsApp connection is currently inactive. Please reconnect it from your Shadecode Student account.",
      metadata: { reason: identity.status },
    };
  }

  return {
    text: "Your Shadecode account is connected. WhatsApp learning actions are being wired into Cortex and your academic context.",
    metadata: { reason: "connected", userId: identity.userId },
  };
}
