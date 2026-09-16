import { describe, expect, it } from "vitest";
import { resolveShadeCapability, summarizeShadeCapabilities } from "./capabilities";

describe("Shade capability policy", () => {
  it("allows capabilities available by platform contract", () => {
    const result = resolveShadeCapability("console.output");
    expect(result.allowed).toBe(true);
    expect(result.capability).toBe("console.output");
  });

  it("does not grant permission-required capabilities without an observation", () => {
    const result = resolveShadeCapability("device.camera");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("explicit support");
  });

  it("accepts an observed available capability", () => {
    const result = resolveShadeCapability("device.files", [{ id: "device.files", availability: "available", source: "native" }]);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("native");
  });

  it("blocks unknown declarations", () => {
    const result = resolveShadeCapability("filesystem.root");
    expect(result.allowed).toBe(false);
    expect(result.capability).toBeNull();
  });

  it("summarizes mixed requirements", () => {
    const result = summarizeShadeCapabilities(["console.output", "device.camera", "network.internet"]);
    expect(result.requested).toBe(3);
    expect(result.allowed).toBe(1);
    expect(result.blocked).toBe(2);
  });
});
