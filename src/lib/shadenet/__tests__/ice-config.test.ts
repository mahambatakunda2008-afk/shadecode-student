import { describe, expect, it } from "vitest";
import { getShadeNetIceConfig } from "../ice-config";

describe("ShadeNet ICE config", () => {
  it("has no bundled third-party relay by default", () => {
    expect(getShadeNetIceConfig({})).toEqual({ iceServers: [] });
  });

  it("accepts configured STUN servers", () => {
    expect(getShadeNetIceConfig({ NEXT_PUBLIC_SHADENET_STUN_URLS: "stun:one.example, stun:two.example" })).toEqual({
      iceServers: [{ urls: "stun:one.example" }, { urls: "stun:two.example" }],
    });
  });

  it("requires credentials when TURN is configured", () => {
    expect(() => getShadeNetIceConfig({ NEXT_PUBLIC_SHADENET_TURN_URLS: "turn:relay.example" })).toThrow();
    expect(getShadeNetIceConfig({
      NEXT_PUBLIC_SHADENET_TURN_URLS: "turn:relay.example",
      NEXT_PUBLIC_SHADENET_TURN_USERNAME: "u",
      NEXT_PUBLIC_SHADENET_TURN_CREDENTIAL: "c",
    })).toEqual({ iceServers: [{ urls: ["turn:relay.example"], username: "u", credential: "c" }] });
  });
});
