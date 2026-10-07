import { describe, expect, it } from "vitest";
import { getCortexRecoveryPolicy } from "./recovery";

describe("Cortex recovery policy", () => {
  it("uses verified data after a provider timeout", () => {
    expect(getCortexRecoveryPolicy("timeout", { hasVerifiedData: true })).toMatchObject({
      action: "use_verified_data",
      automatic: true,
      maxAttempts: 0,
    });
  });

  it("uses a warm local capability instead of retrying a provider outage", () => {
    expect(getCortexRecoveryPolicy("provider_unavailable", { hasWarmLocal: true })).toMatchObject({
      action: "use_warm_local",
      automatic: true,
      maxAttempts: 0,
    });
  });

  it("repairs invalid output once instead of restarting the task", () => {
    expect(getCortexRecoveryPolicy("invalid_response", { supportsRepair: true })).toMatchObject({
      action: "repair_output",
      automatic: true,
      maxAttempts: 1,
    });
  });

  it("resumes a checkpoint after an abort", () => {
    expect(getCortexRecoveryPolicy("aborted", { hasCheckpoint: true })).toMatchObject({
      action: "resume_checkpoint",
      automatic: true,
      maxAttempts: 0,
    });
  });

  it("never invents a curriculum fallback", () => {
    expect(getCortexRecoveryPolicy("grounding_unavailable")).toMatchObject({
      action: "stop_cleanly",
      automatic: false,
    });
  });

  it("stops unknown failures rather than looping", () => {
    expect(getCortexRecoveryPolicy("unknown")).toMatchObject({
      action: "stop_cleanly",
      automatic: false,
      maxAttempts: 0,
    });
  });
});
