import { describe, expect, it } from "vitest";
import { buildWhatsAppResponse } from "@/lib/channels/whatsapp/response";

const identity = {
  id: "identity-1",
  channel: "whatsapp" as const,
  externalUserId: "263771234567",
  userId: "user-1",
  role: "student" as const,
  status: "active" as const,
  linkedAt: "2026-09-13T00:00:00.000Z",
};

describe("WhatsApp response boundary", () => {
  it("returns a linking response for an unknown identity", () => {
    const result = buildWhatsAppResponse(null);
    expect(result.metadata).toEqual({ reason: "unlinked" });
    expect(result.text).toContain("not linked");
  });

  it("returns an inactive response for blocked identities", () => {
    const result = buildWhatsAppResponse({ ...identity, status: "blocked" });
    expect(result.metadata).toEqual({ reason: "blocked" });
    expect(result.text).toContain("inactive");
  });

  it("recognises an active linked identity", () => {
    const result = buildWhatsAppResponse(identity);
    expect(result.metadata).toEqual({ reason: "connected", userId: "user-1" });
  });
});
