import { NextResponse } from "next/server";
import { dispatchWhatsAppTextEvent } from "@/lib/channels/whatsapp/application";
import {
  parseWhatsAppTextEvents,
  verifyWhatsAppChallenge,
  verifyWhatsAppSignature,
} from "@/lib/channels/whatsapp/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = verifyWhatsAppChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    expectedToken: getRequiredEnv("WHATSAPP_VERIFY_TOKEN"),
  });

  if (challenge === null) {
    return new NextResponse("Forbidden", { status: 403 });
  }

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
      results.push(await dispatchWhatsAppTextEvent(event));
    } catch (error) {
      console.error("WhatsApp webhook dispatch failed", {
        messageId: event.messageId,
        error,
      });
    }
  }

  return NextResponse.json({ received: true, processed: results.length }, { status: 200 });
}
