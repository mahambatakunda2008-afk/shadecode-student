import { describe, expect, it } from "vitest";
import { canAdvertise, DEFAULT_DISCOVERY_POLICY, pruneExpiredPeers, rankPeers } from "../discovery";

describe("ShadeNet discovery", () => {
  it("does not advertise by default", () => {
    expect(canAdvertise(DEFAULT_DISCOVERY_POLICY, "peer")).toBe(false);
  });

  it("rejects private resources", () => {
    const policy = { ...DEFAULT_DISCOVERY_POLICY, enabled: true, allowResourceAdvertisements: true };
    expect(canAdvertise(policy, "private")).toBe(false);
    expect(canAdvertise(policy, "peer")).toBe(true);
  });

  it("prunes expired peers and bounds the list", () => {
    const now = Date.parse("2026-08-16T00:00:00.000Z");
    const peers = Array.from({ length: 40 }, (_, i) => ({
      peerId: `peer-${i}`,
      protocol: 1 as const,
      expiresAt: i === 0 ? "2026-08-15T00:00:00.000Z" : "2026-08-17T00:00:00.000Z",
      capabilities: { resourceExchange: true, maxChunkBytes: 65536 },
    }));
    expect(pruneExpiredPeers(peers, now)).toHaveLength(32);
    expect(rankPeers(peers)[0].peerId).toBe("peer-0");
  });
});
