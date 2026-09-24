import { describe, expect, it } from "vitest";
import { chooseCortexExecutionPath } from "./executionPolicy";
import { chooseHybridExecutionMode, firstSuccessful } from "./hybridRuntime";

describe("Cortex hybrid execution policy", () => {
  it("allows warm local and cloud to run in parallel", () => {
    const d = chooseCortexExecutionPath({ online: true, browserModelReady: true, peerAvailable: false, cloudAvailable: true }, "deep");
    expect(d.primary).toBe("browser-local-model");
    expect(d.fallbacks).toEqual(["cloud-fallback"]);
  });

  it("keeps offline work deterministic", () => {
    const d = chooseCortexExecutionPath({ online: false, browserModelReady: false, peerAvailable: false, cloudAvailable: true }, "simple");
    expect(d.primary).toBe("deterministic-local");
  });

  it("keeps peer execution before cloud when no local model exists", () => {
    const d = chooseCortexExecutionPath({ online: true, browserModelReady: false, peerAvailable: true, cloudAvailable: true }, "generative");
    expect(d.primary).toBe("peer-assisted");
  });

  it("selects parallel mode only when local is already warm", () => {
    expect(chooseHybridExecutionMode({
      online: true, browserModelReady: true, browserModelAvailable: true,
      cloudAvailable: true, peerAvailable: false,
    }, "deep").mode).toBe("parallel");

    expect(chooseHybridExecutionMode({
      online: true, browserModelReady: false, browserModelAvailable: true,
      cloudAvailable: true, peerAvailable: false,
    }, "deep").mode).toBe("parallel-prep");
  });

  it("waits for the first successful lane instead of failing on the first rejection", async () => {
    const result = await firstSuccessful([
      Promise.reject(new Error("fast lane failed")),
      new Promise<string>((resolve) => setTimeout(() => resolve("slow lane won"), 5)),
    ]);
    expect(result).toBe("slow lane won");
  });
});