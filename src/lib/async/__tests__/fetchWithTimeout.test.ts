import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout, FetchTimeoutError } from "../fetchWithTimeout";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchWithTimeout", () => {
  it("resolves normally when fetch completes before the timeout", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("/api/test", {}, 1000);
    expect(result).toBe(mockResponse);
  });

  it("throws FetchTimeoutError when the request is aborted for taking too long", async () => {
    global.fetch = vi.fn().mockImplementation((_url, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    });

    await expect(fetchWithTimeout("/api/slow", {}, 20)).rejects.toBeInstanceOf(FetchTimeoutError);
  });

  it("passes an AbortSignal to fetch so the request can actually be cancelled", async () => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementation((_url, options: RequestInit) => {
      capturedSignal = options.signal ?? undefined;
      return Promise.resolve(new Response("ok"));
    });

    await fetchWithTimeout("/api/test", {}, 1000);
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it("propagates a genuine non-timeout error unchanged", async () => {
    const networkError = new Error("network down");
    global.fetch = vi.fn().mockRejectedValue(networkError);

    await expect(fetchWithTimeout("/api/test", {}, 1000)).rejects.toBe(networkError);
  });

  it("preserves caller-provided options alongside the abort signal", async () => {
    let capturedOptions: RequestInit | undefined;
    global.fetch = vi.fn().mockImplementation((_url, options: RequestInit) => {
      capturedOptions = options;
      return Promise.resolve(new Response("ok"));
    });

    await fetchWithTimeout("/api/test", { method: "POST", body: "hello" }, 1000);
    expect(capturedOptions?.method).toBe("POST");
    expect(capturedOptions?.body).toBe("hello");
  });
});
