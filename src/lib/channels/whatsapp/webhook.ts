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

interface WhatsAppChange {
  value?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null) : [];
}

export function parseWhatsAppTextEvents(payload: unknown): ParsedWhatsAppTextEvent[] {
  const root = asRecord(payload);
  if (!root) return [];

  const events: ParsedWhatsAppTextEvent[] = [];
  for (const entry of asRecords(root.entry)) {
    const changes = asRecords(entry.changes) as WhatsAppChange[];
    for (const change of changes) {
      const value = asRecord(change.value);
      if (!value) continue;

      const metadata = asRecord(value.metadata);
      const phoneNumberId = typeof metadata?.phone_number_id === "string"
        ? metadata.phone_number_id
        : "";

      for (const message of asRecords(value.messages)) {
        const text = asRecord(message.text);
        if (message.type !== "text" || !text) continue;

        const body = text.body;
        const messageId = message.id;
        const externalUserId = message.from;
        if (
          typeof body !== "string" || !body.trim() ||
          typeof messageId !== "string" ||
          typeof externalUserId !== "string"
        ) continue;

        events.push({
          messageId,
          externalUserId,
          text: body.trim(),
          timestamp: typeof message.timestamp === "string" ? message.timestamp : undefined,
          phoneNumberId,
        });
      }
    }
  }

  return events;
}
