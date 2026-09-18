import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWhatsAppTextEvents, verifyWhatsAppChallenge, verifyWhatsAppSignature } from "./webhook";

describe("WhatsApp webhook contract", () => {
  it("accepts a valid signature and rejects tampering", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const secret = "test-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
    expect(verifyWhatsAppSignature(body, signature, secret)).toBe(true);
    expect(verifyWhatsAppSignature(body + "x", signature, secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, "sha256=bad", secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, null, secret)).toBe(false);
  });

  it("only accepts the expected verification challenge", () => {
    expect(verifyWhatsAppChallenge({ mode: "subscribe", token: "verify-token", challenge: "123456", expectedToken: "verify-token" })).toBe("123456");
    expect(verifyWhatsAppChallenge({ mode: "subscribe", token: "wrong", challenge: "123456", expectedToken: "verify-token" })).toBeNull();
    expect(verifyWhatsAppChallenge({ mode: "unsubscribe", token: "verify-token", challenge: "123456", expectedToken: "verify-token" })).toBeNull();
  });

  it("extracts only valid text messages", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: {
        metadata: { phone_number_id: "phone-123" },
        messages: [
          { id: "wamid-1", from: "263771234567", timestamp: "1720000000", type: "text", text: { body: "  LEARN Mathematics: functions  " } },
          { id: "wamid-2", from: "263771234567", type: "image", image: { id: "media-1" } },
          { id: "wamid-3", from: "263771234567", type: "text", text: { body: "" } },
        ],
      } }] }],
    };
    expect(parseWhatsAppTextEvents(payload)).toEqual([{
      messageId: "wamid-1", externalUserId: "263771234567", text: "LEARN Mathematics: functions",
      timestamp: "1720000000", phoneNumberId: "phone-123",
    }]);
  });

  it("fails closed for malformed or unsupported payloads", () => {
    expect(parseWhatsAppTextEvents(null)).toEqual([]);
    expect(parseWhatsAppTextEvents({ entry: "not-an-array" })).toEqual([]);
    expect(parseWhatsAppTextEvents({ entry: [{ changes: [{ value: { messages: [{ type: "text" }] } }] }] })).toEqual([]);
  });
});
