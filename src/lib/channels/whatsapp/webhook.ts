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

export function parseWhatsAppTextEvents(payload: unknown): ParsedWhatsAppTextEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const entries = Array.isArray(root.entry) ? root.entry : [];
  const events: ParsedWhatsAppTextEvent[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? (entry as Record<string, unknown>).changes
      : [];
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const value = (change as Record<string, unknown>).value;
      if (!value || typeof value !== "object") continue;
      const valueRecord = value as Record<string, unknown>;
      const metadata = valueRecord.metadata;
      const phoneNumberId = metadata && typeof metadata === "object"
        ? String((metadata as Record<string, unknown>).phone_number_id ?? "")
        : "";
      const messages = Array.isArray(valueRecord.messages) ? valueRecord.messages : [];
      for (const message of messages) {
        if (!message || typeof message !== "object") continue;
        const record = message as Record<string, unknown>;
        const text = record.text;
        if (record.type !== "text" || !text || typeof text !== "object") continue;
        const body = (text as Record<string, unknown>).body;
        if (typeof body !== "string" || !body.trim()) continue;
        if (typeof record.id !== "string" || typeof record.from !== "string") continue;
        events.push({
          messageId: record.id,
          externalUserId: record.from,
          text: body.trim(),
          timestamp: typeof record.timestamp === "string" ? record.timestamp : undefined,
          phoneNumberId,
        });
      }
    }
  }
  return events;
}
