import { describe, expect, it, vi } from "vitest";
import { readPublicWebDocument } from "../web-document-reader";

const publicResolver = async () => ["93.184.216.34"];

describe("public web document reader", () => {
  it("extracts readable text from HTML and preserves provenance", async () => {
    const html = "<html><head><title>Wave motion</title><script>tracking()</script></head><body><nav>Menu</nav><main><h1>Wave motion</h1><p>Waves transfer energy from one place to another without transferring matter overall. This is a sufficiently long educational paragraph.</p></main></body></html>";
    const fetcher = vi.fn(async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
    const resource = await readPublicWebDocument({ url: "https://physics.example.org/waves", subject: "Physics", fetcher: fetcher as unknown as typeof fetch, resolver: publicResolver });
    expect(resource.metadata.title).toBe("Wave motion");
    expect(resource.metadata.verificationStatus).toBe("unverified");
    expect(resource.content).toMatchObject({ kind: "web-document", documentType: "webpage" });
    expect((resource.content as { text: string }).text).toContain("Waves transfer energy");
    expect((resource.content as { text: string }).text).not.toContain("tracking");
  });

  it("rejects private and non-HTTPS targets before making a request", async () => {
    const fetcher = vi.fn();
    await expect(readPublicWebDocument({ url: "http://example.org", fetcher: fetcher as unknown as typeof fetch, resolver: publicResolver })).rejects.toThrow("public HTTPS");
    await expect(readPublicWebDocument({ url: "https://internal.example", fetcher: fetcher as unknown as typeof fetch, resolver: async () => ["10.0.0.8"] })).rejects.toThrow("public internet address");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types", async () => {
    const fetcher = vi.fn(async () => new Response("not a page", { status: 200, headers: { "content-type": "application/json" } }));
    await expect(readPublicWebDocument({ url: "https://example.org/data", fetcher: fetcher as unknown as typeof fetch, resolver: publicResolver })).rejects.toThrow("not an HTML webpage or PDF");
  });

  it("rejects documents larger than the bounded download size", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { status: 200, headers: { "content-type": "text/html" } }));
    await expect(readPublicWebDocument({ url: "https://example.org/large", fetcher: fetcher as unknown as typeof fetch, resolver: publicResolver })).rejects.toThrow("8 MB");
  });
});
