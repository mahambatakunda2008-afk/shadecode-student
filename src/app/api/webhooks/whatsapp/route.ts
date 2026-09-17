import { NextResponse } from "next/server";
import { dispatchWhatsAppTextEvent } from "@/lib/channels/whatsapp/application";
import { sendWhatsAppTextMessage } from "@/lib/channels/whatsapp/delivery";
import {
  parseWhatsAppTextEvents,
  verifyWhatsAppChallenge,
  verifyWhatsAppSignature,
} from "@/lib/channels/whatsapp/webhook";
import {
  claimWhatsAppMessage,
  markWhatsAppMessageCompleted,
  markWhatsAppMessageDelivered,
  markWhatsAppMessageDeliveryFailed,
  markWhatsAppMessageFailed,
} from "@/lib/channels/whatsapp/message-receipts";
import { consumeWhatsAppLinkCode } from "@/lib/platform/channel-link-codes";
import { linkChannelIdentity } from "@/lib/platform/channel-identity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function parseLinkCommand(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let firstWhitespace = -1;
  for (let index = 0; index < trimmed.length; index += 1) {
    if (/\s/.test(trimmed[index])) {
      firstWhitespace = index;
      break;
    }
  }
  if (firstWhitespace < 0) return null;

  const command = trimmed.slice(0, firstWhitespace).toUpperCase();
  if (command !== "LINK" && command !== "CONNECT") return null;

  const code = trimmed.slice(firstWhitespace).trim().toUpperCase();
  if (code.length !== 8 || !/^[A-Z0-9]{8}$/.test(code)) return null;
  return code;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = verifyWhatsAppChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    expectedToken: getRequiredEnv("WHATSAPP_VERIFY_TOKEN"),
  });

  if (challenge === null) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature, getRequiredEnv("WHATSAPP_APP_SECRET"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const events = parseWhatsAppTextEvents(payload);
  const results: Array<{
    event: (typeof events)[number];
    receiptId: string | null;
    response: { text: string; metadata?: Record<string, unknown> };
  }> = [];

  for (const event of events) {
    let receiptId: string | null = null;
    try {
      const receipt = await claimWhatsAppMessage({
        messageId: event.messageId,
        externalUserId: event.externalUserId,
        phoneNumberId: event.phoneNumberId,
      });

      if (receipt.kind === "duplicate") {
        if (receipt.status === "completed" && receipt.deliveryStatus === "delivered") continue;
        if (!receipt.responseText) continue;
        results.push({
          event,
          receiptId: receipt.id,
          response: { text: receipt.responseText },
        });
        continue;
      }

      receiptId = receipt.id;
      const linkCode = parseLinkCommand(event.text);
      if (linkCode) {
        const linked = await consumeWhatsAppLinkCode({
          code: linkCode,
          externalUserId: event.externalUserId,
        });
        if (!linked) {
          const response = { text: "That Shadecode link code is invalid, expired, or already used." };
          await markWhatsAppMessageCompleted({ receiptId, responseText: response.text });
          results.push({ event, receiptId, response });
          continue;
        }

        const identity = await linkChannelIdentity({
          channel: "whatsapp",
          externalUserId: event.externalUserId,
          userId: linked.userId,
          role: linked.role,
        });

        const response = {
          text: "WhatsApp is now linked to your Shadecode account. You can start by asking me what you want to learn.",
          metadata: { status: "linked", role: identity.role },
        };
        await markWhatsAppMessageCompleted({ receiptId, responseText: response.text });
        results.push({ event, receiptId, response });
        continue;
      }

      const result = await dispatchWhatsAppTextEvent(event);
      await markWhatsAppMessageCompleted({ receiptId, responseText: result.response.text });
      results.push({ ...result, receiptId });
    } catch (error) {
      console.error("WhatsApp webhook dispatch failed", { messageId: event.messageId, error });
      if (receiptId) {
        try { await markWhatsAppMessageFailed(receiptId); }
        catch (stateError) { console.error("WhatsApp receipt failure-state update failed", { messageId: event.messageId, error: stateError }); }
      }
      results.push({
        event,
        receiptId: null,
        response: { text: "I couldn't process that message right now. Please try again in a moment.", metadata: { status: "error", retryable: true } },
      });
    }
  }

  let delivered = 0;
  for (const result of results) {
    try {
      await sendWhatsAppTextMessage({ phoneNumberId: result.event.phoneNumberId, recipient: result.event.externalUserId, text: result.response.text });
      delivered += 1;
      if (result.receiptId) await markWhatsAppMessageDelivered(result.receiptId);
    } catch (error) {
      console.error("WhatsApp response delivery failed", { messageId: result.event.messageId, error });
      if (result.receiptId) {
        try { await markWhatsAppMessageDeliveryFailed(result.receiptId); }
        catch (stateError) { console.error("WhatsApp delivery-state update failed", { messageId: result.event.messageId, error: stateError }); }
      }
    }
  }

  return NextResponse.json({ received: true, processed: results.length, delivered }, { status: 200 });
}
