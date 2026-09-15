import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWhatsAppSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !appSecret) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const provided = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}

export function verifyWhatsAppChallenge(input: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  expectedToken: string;
}): string | null {
  if (input.mode !== "subscribe") return null;
  if (!input.token || input.token !== input.expectedToken) return null;
  return input.challenge;
}

export interface ParsedWhatsAppTextEvent {
  messageId: string;
  externalUserId: string;
  text: string;
  timestamp?: string;
  phoneNumberId: string;
}

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function parseWhatsAppTextEvents(payload: unknown): ParsedWhatsAppTextEvent[] {
  if (!isRecord(payload)) return [];
  const events: ParsedWhatsAppTextEvent[] = [];
  for (const entry of asRecords(payload.entry)) {
    for (const change of asRecords(entry.changes)) {
      const value = change.value;
      if (!isRecord(value)) continue;
      const metadata = isRecord(value.metadata) ? value.metadata : null;
      const phoneNumberId = typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : "";
      for (const message of asRecords(value.messages)) {
        if (message.type !== "text" || !isRecord(message.text)) continue;
        const body = message.text.body;
        if (typeof body !== "string" || !body.trim()) continue;
        if (typeof message.id !== "string" || typeof message.from !== "string") continue;
        events.push({
          messageId: message.id,
          externalUserId: message.from,
          text: body.trim(),
          timestamp: typeof message.timestamp === "string" ? message.timestamp : undefined,
          phoneNumberId,
        });
      }
    }
  }
  return events;
}
