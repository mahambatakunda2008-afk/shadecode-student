import { describe, expect, it } from "vitest";
import { createCircuitBreaker } from "./aiCircuitBreaker";

function setup() {
  let time = 1_000_000;
  const breaker = createCircuitBreaker({ failureThreshold: 3, windowMs: 600_000, openMs: 180_000, now: () => time });
  return { breaker, advance: (ms: number) => { time += ms; } };
}

describe("circuit breaker", () => {
  it("stays closed below the threshold and forgets old failures", () => {
    const { breaker, advance } = setup();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state()).toBe("closed");
    advance(700_000); // outside the window
    breaker.recordFailure();
    expect(breaker.state()).toBe("closed");
    expect(breaker.shouldAttempt()).toBe(true);
  });

  it("opens after repeated failures and skips the AI while open", () => {
    const { breaker } = setup();
    breaker.recordFailure(); breaker.recordFailure(); breaker.recordFailure();
    expect(breaker.state()).toBe("open");
    expect(breaker.shouldAttempt()).toBe(false);
  });

  it("allows exactly one probe after the open period, then closes on success", () => {
    const { breaker, advance } = setup();
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    advance(181_000);
    expect(breaker.state()).toBe("half-open");
    expect(breaker.shouldAttempt()).toBe(true);
    expect(breaker.shouldAttempt()).toBe(false); // concurrent callers do not stampede the providers
    breaker.recordSuccess();
    expect(breaker.state()).toBe("closed");
    expect(breaker.shouldAttempt()).toBe(true);
  });

  it("re-opens immediately when the probe fails", () => {
    const { breaker, advance } = setup();
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    advance(181_000);
    expect(breaker.shouldAttempt()).toBe(true);
    breaker.recordFailure();
    expect(breaker.state()).toBe("open");
    expect(breaker.shouldAttempt()).toBe(false);
    advance(181_000);
    expect(breaker.shouldAttempt()).toBe(true);
  });
});
