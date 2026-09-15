import type { ChannelResponse } from "@/lib/channels/types";

export function unlinkedWhatsAppResponse(): ChannelResponse {
  return {
    text: "Your WhatsApp number is not linked to a Shadecode account yet. Open Shadecode Student and link WhatsApp from your account settings.",
    metadata: { status: "unlinked" },
  };
}

export function inactiveWhatsAppResponse(status: "blocked" | "unlinked"): ChannelResponse {
  return {
    text: "This Shadecode WhatsApp connection is currently inactive. Please reconnect it from your Shadecode account.",
    metadata: { status },
  };
}
