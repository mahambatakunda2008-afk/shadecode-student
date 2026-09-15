import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppTextMessage } from "@/lib/channels/whatsapp/delivery";

describe("WhatsApp Meta delivery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_API_VERSION;
  });

  it("posts a text message to the configured phone number endpoint", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_API_VERSION = "v23.0";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 }),
    );

    await sendWhatsAppTextMessage({
      phoneNumberId: "123456",
      recipient: "263771234567",
      text: "Hello from Shadecode",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v23.0/123456/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: "263771234567",
          type: "text",
          text: { preview_url: false, body: "Hello from Shadecode" },
        }),
      }),
    );
  });

  it("surfaces Meta API failures without leaking the access token", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "super-secret-token";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid recipient", { status: 400 }),
    );

    await expect(
      sendWhatsAppTextMessage({
        phoneNumberId: "123456",
        recipient: "263771234567",
        text: "Hello",
      }),
    ).rejects.toThrow("WhatsApp delivery failed (400): invalid recipient");
  });
});
