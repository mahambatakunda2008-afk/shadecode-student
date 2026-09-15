import "server-only";

import type { ChannelResponse } from "@/lib/channels/types";
import { buildPlatformRequestContext } from "@/lib/platform/server-context";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";
import {
  buildWhatsAppResponse,
  inactiveWhatsAppResponse,
  unlinkedWhatsAppResponse,
} from "@/lib/channels/whatsapp/response";

export interface WhatsAppApplicationResult {
  event: ParsedWhatsAppTextEvent;
  response: ChannelResponse;
  userId: string | null;
}

export async function dispatchWhatsAppTextEvent(
  event: ParsedWhatsAppTextEvent,
): Promise<WhatsAppApplicationResult> {
  const identity = await resolveChannelIdentity("whatsapp", event.externalUserId);

  if (!identity) {
    return {
      event,
      userId: null,
      response: unlinkedWhatsAppResponse(),
    };
  }

  if (identity.status !== "active") {
    return {
      event,
      userId: identity.userId,
      response: inactiveWhatsAppResponse(identity.status),
    };
  }

  const context = await buildPlatformRequestContext({
    userId: identity.userId,
    role: identity.role,
    channel: "whatsapp",
    metadata: {
      whatsappMessageId: event.messageId,
      whatsappPhoneNumberId: event.phoneNumberId,
    },
  });

  const connected = buildWhatsAppResponse(identity);

  return {
    event,
    userId: context.identity.userId,
    response: {
      text: "Your message reached Shadecode. Cortex routing is ready to be connected to this verified platform context.",
      metadata: {
        ...connected.metadata,
        status: "authenticated",
        role: context.identity.role,
        channel: context.identity.channel,
      },
    },
  };
}
