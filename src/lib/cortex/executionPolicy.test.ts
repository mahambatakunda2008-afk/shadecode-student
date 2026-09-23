import { describe, expect, it } from "vitest";
import { chooseCortexExecutionPath } from "./executionPolicy";

describe("Cortex local-first execution policy", () => {
  it("prefers local inference over cloud", () => {
    const d = chooseCortexExecutionPath({ online: true, browserModelReady: true, peerAvailable: false, cloudAvailable: true }, "deep");
    expect(d.primary).toBe("browser-local-model");
    expect(d.fallbacks).toEqual(["cloud-fallback"]);
  });
  it("works offline without a model", () => {
    const d = chooseCortexExecutionPath({ online: false, browserModelReady: false, peerAvailable: false, cloudAvailable: true }, "simple");
    expect(d.primary).toBe("deterministic-local");
  });
  it("prefers peer execution over cloud", () => {
    const d = chooseCortexExecutionPath({ online: true, browserModelReady: false, peerAvailable: true, cloudAvailable: true }, "generative");
    expect(d.primary).toBe("peer-assisted");
  });
});