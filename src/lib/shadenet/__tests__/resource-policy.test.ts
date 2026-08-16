import { describe, expect, it } from "vitest";
import { canReplicate, canShare, DEFAULT_RESOURCE_POLICY } from "../resource-policy";

describe("ShadeNet resource policy", () => {
  it("keeps resources private by default", () => {
    expect(canShare(DEFAULT_RESOURCE_POLICY, "peer")).toBe(false);
    expect(canShare(DEFAULT_RESOURCE_POLICY, "public")).toBe(false);
  });

  it("blocks replication on metered networks and low battery by default", () => {
    expect(canReplicate(DEFAULT_RESOURCE_POLICY, 1024, true, false)).toBe(false);
    expect(canReplicate(DEFAULT_RESOURCE_POLICY, 1024, false, true)).toBe(false);
  });
});
