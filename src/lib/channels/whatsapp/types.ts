import type { ChannelMessage, ChannelResponse } from "@/lib/channels/types";

export interface WhatsAppTextMessage {
  id: string;
  from: string;
  text: string;
  timestamp?: string;
}

export interface WhatsAppChannelContext {
  messageId: string;
  externalUserId: string;
  phoneNumberId: string;
}

export interface WhatsAppAdapter {
  receive(message: WhatsAppTextMessage, context: WhatsAppChannelContext): Promise<ChannelResponse>;
}

export function toChannelMessage(
  message: WhatsAppTextMessage,
  context: WhatsAppChannelContext,
): ChannelMessage {
  return {
    id: message.id,
    channel: "whatsapp",
    identity: { externalId: context.externalUserId },
    text: message.text,
    metadata: {
      messageId: message.id,
      phoneNumberId: context.phoneNumberId,
      timestamp: message.timestamp ?? null,
    },
  };
}
