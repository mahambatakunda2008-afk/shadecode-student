import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/rate-limit/limiter";

describe("RateLimiter", () => {
  it("allows up to the configured request count and then blocks", () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });
    expect(limiter.check("u").success).toBe(true);
    expect(limiter.check("u").remaining).toBe(0);
    expect(limiter.check("u").success).toBe(false);
  });

  it("isolates identifiers", () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 1 });
    expect(limiter.check("a").success).toBe(true);
    expect(limiter.check("a").success).toBe(false);
    expect(limiter.check("b").success).toBe(true);
  });
});
