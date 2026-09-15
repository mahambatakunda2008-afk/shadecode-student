import "server-only";

interface WhatsAppTextMessageInput {
  phoneNumberId: string;
  recipient: string;
  text: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export async function sendWhatsAppTextMessage(input: WhatsAppTextMessageInput): Promise<void> {
  if (!input.phoneNumberId.trim() || !input.recipient.trim() || !input.text.trim()) {
    throw new Error("WhatsApp delivery requires a phone number id, recipient and text.");
  }

  const token = required("WHATSAPP_ACCESS_TOKEN");
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(input.phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.recipient,
      type: "text",
      text: { preview_url: false, body: input.text.trim() },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp delivery failed (${response.status}): ${detail.slice(0, 500)}`);
  }
}
