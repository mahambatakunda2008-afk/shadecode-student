import "server-only";

import type { ChannelResponse } from "@/lib/channels/types";
import { buildPlatformRequestContext } from "@/lib/platform/server-context";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import { buildWhatsAppResponse } from "@/lib/channels/whatsapp/response";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";

export interface WhatsAppApplicationResult {
  response: ChannelResponse;
  userId: string | null;
  accepted: boolean;
}

export async function handleWhatsAppTextEvent(
  event: ParsedWhatsAppTextEvent,
): Promise<WhatsAppApplicationResult> {
  const identity = await resolveChannelIdentity("whatsapp", event.externalUserId);
  const response = buildWhatsAppResponse(identity);

  if (!identity || identity.status !== "active") {
    return { response, userId: null, accepted: false };
  }

  await buildPlatformRequestContext({
    userId: identity.userId,
    role: identity.role,
    channel: "whatsapp",
    locale: null,
    metadata: {
      whatsappMessageId: event.messageId,
      whatsappPhoneNumberId: event.phoneNumberId,
    },
  });

  return {
    response,
    userId: identity.userId,
    accepted: true,
  };
}
