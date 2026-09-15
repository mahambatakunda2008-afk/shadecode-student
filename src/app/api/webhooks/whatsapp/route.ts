import { NextResponse } from "next/server";
import { dispatchWhatsAppTextEvent } from "@/lib/channels/whatsapp/application";
import { sendWhatsAppTextMessage } from "@/lib/channels/whatsapp/delivery";
import {
  parseWhatsAppTextEvents,
  verifyWhatsAppChallenge,
  verifyWhatsAppSignature,
} from "@/lib/channels/whatsapp/webhook";
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
  const match = text.trim().match(/^(?:LINK|CONNECT)\s+([A-Z0-9]{8})$/i);
  return match?.[1]?.toUpperCase() ?? null;
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
  const results = [];

  for (const event of events) {
    try {
      const linkCode = parseLinkCommand(event.text);
      if (linkCode) {
        const linked = await consumeWhatsAppLinkCode({
          code: linkCode,
          externalUserId: event.externalUserId,
        });
        if (!linked) {
          results.push({
            event,
            userId: null,
            response: {
              text: "That Shadecode link code is invalid, expired, or already used.",
            },
          });
          continue;
        }

        const identity = await linkChannelIdentity({
          channel: "whatsapp",
          externalUserId: event.externalUserId,
          userId: linked.userId,
          role: linked.role,
        });

        results.push({
          event,
          userId: identity.userId,
          response: {
            text: "WhatsApp is now linked to your Shadecode account. You can start by asking me what you want to learn.",
            metadata: { status: "linked", role: identity.role },
          },
        });
        continue;
      }

      results.push(await dispatchWhatsAppTextEvent(event));
    } catch (error) {
      console.error("WhatsApp webhook dispatch failed", {
        messageId: event.messageId,
        error,
      });
    }
  }

  let delivered = 0;
  for (const result of results) {
    try {
      await sendWhatsAppTextMessage({
        phoneNumberId: result.event.phoneNumberId,
        recipient: result.event.externalUserId,
        text: result.response.text,
      });
      delivered += 1;
    } catch (error) {
      console.error("WhatsApp response delivery failed", {
        messageId: result.event.messageId,
        error,
      });
    }
  }

  return NextResponse.json(
    { received: true, processed: results.length, delivered },
    { status: 200 },
  );
}
