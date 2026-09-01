import { describe, expect, it, vi } from "vitest";
import { nextRetryState, shouldRetry } from "./retry";

describe("local-first retry policy", () => {
  it("backs off exponentially and adds bounded jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const state = nextRetryState(null, new Error("offline"), undefined, 1_000);
    expect(state.attempts).toBe(1);
    expect(state.permanentFailure).toBe(false);
    expect(state.nextRetryAt).toBe(2_000);
    vi.restoreAllMocks();
  });

  it("eventually marks a mutation as permanently failed", () => {
    let state = null;
    for (let i = 0; i < 6; i++) state = nextRetryState(state, "server rejected", undefined, 10_000);
    expect(state?.permanentFailure).toBe(true);
    expect(state?.attempts).toBe(6);
  });

  it("only retries when the scheduled time has arrived", () => {
    const state = nextRetryState(null, "offline", undefined, 1_000);
    expect(shouldRetry(state, state.nextRetryAt - 1)).toBe(false);
    expect(shouldRetry(state, state.nextRetryAt)).toBe(true);
  });
});
