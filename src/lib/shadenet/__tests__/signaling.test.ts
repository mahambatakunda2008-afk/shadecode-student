import { describe, expect, it } from "vitest";
import { createSignalSession, isSignalValid } from "../signaling";

describe("ShadeNet signaling", () => {
  it("creates expiring sessions", () => {
    const session = createSignalSession("peer-a", 1000, 100);
    expect(session.peerId).toBe("peer-a");
    expect(session.expiresAt).toBe(1100);
  });

  it("rejects expired and self-directed messages", () => {
    const valid = { sessionId: "s", fromPeerId: "a", toPeerId: "b", type: "offer" as const, payload: {}, expiresAt: 1000 };
    expect(isSignalValid(valid, 999)).toBe(true);
    expect(isSignalValid(valid, 1000)).toBe(false);
    expect(isSignalValid({ ...valid, fromPeerId: "b" }, 999)).toBe(false);
  });
});
