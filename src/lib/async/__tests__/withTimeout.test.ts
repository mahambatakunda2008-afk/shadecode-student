import { describe, it, expect } from "vitest";
import { withTimeout, TimeoutError } from "../withTimeout";

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function neverResolves<T>(): Promise<T> {
  return new Promise(() => {
    /* intentionally never settles -- simulates a genuine hang */
  });
}

describe("withTimeout", () => {
  it("resolves normally when the inner promise settles before the timeout", async () => {
    const result = await withTimeout(delay(10, "done"), 1000);
    expect(result).toBe("done");
  });

  it("rejects with TimeoutError when the inner promise takes too long", async () => {
    await expect(withTimeout(delay(200, "too slow"), 20)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("propagates the inner promise's own rejection rather than a timeout, when it rejects first", async () => {
    const innerError = new Error("real failure");
    const rejecting = Promise.reject(innerError);
    await expect(withTimeout(rejecting, 1000)).rejects.toBe(innerError);
  });

  it("never resolves without the wrapper -- confirms the wrapper actually terminates a genuine hang", async () => {
    await expect(withTimeout(neverResolves(), 20)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("uses a custom timeout message when provided", async () => {
    await expect(withTimeout(neverResolves(), 10, "dashboard intelligence fetch")).rejects.toThrow(
      "dashboard intelligence fetch"
    );
  });
});
