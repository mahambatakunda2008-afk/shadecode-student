import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression coverage for the callAI provider fallback chain (src/lib/ai.ts).
//
// Context: commit a3dedf4 ("route production generation through stable gateway") deleted the
// OpenRouter fallback and replaced it with a Vercel AI Gateway call gated on AI_GATEWAY_API_KEY.
// In production that env var was unset, so the Gateway branch never ran (zero logged calls,
// success or failure), and OpenRouter — the only provider with any real success rate that week —
// was gone. With Cloudflare and Gemini both failing, lesson generation had effectively no working
// fallback for ~22 hours. These tests pin: OpenRouter is present and reachable, it is skipped
// cleanly when its key is absent (never throws), and the chain order is Gateway -> OpenRouter ->
// Cloudflare -> Gemini -> OpenAI, so no provider silently drops out of the chain again.

vi.mock("@/lib/ai/tracker", () => ({ logAIUsage: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/curriculum/ai-grounding", () => ({ getVerifiedCurriculumPromptContext: vi.fn().mockResolvedValue("") }));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("callAI provider fallback chain", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.unstubAllEnvs();
    // Skip-friendly baseline: no provider configured. Each test opts in the ones it needs.
    for (const key of ["OLLAMA_BASE_URL", "AI_GATEWAY_API_KEY", "OPENROUTER_API_KEY", "CLOUDFLARE_API_TOKEN", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "OPENAI_API_KEY", "ALLOW_PAID_AI"]) {
      vi.stubEnv(key, "");
    }
  });
  afterEach(() => vi.unstubAllEnvs());

  it("calls OpenRouter and returns its text when it is the only configured provider", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "a lesson from openrouter" } }] }));
    const { callAI } = await import("./ai");
    const result = await callAI("teach me quadratics", 500, { skipCurriculumGrounding: true, curriculumContext: "" });
    expect(result).toBe("a lesson from openrouter");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(JSON.parse((init as RequestInit).body as string).model).toBe("openrouter/free");
  });

  it("does not throw and returns null when no provider is configured (OpenRouter absent)", async () => {
    const { callAI } = await import("./ai");
    await expect(callAI("teach me quadratics", 500, { skipCurriculumGrounding: true, curriculumContext: "" })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tries OpenRouter after the Gateway and before Cloudflare, falling through on failure", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw-key");
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "cf-key");
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("ai-gateway.vercel.sh")) return jsonResponse(null, false, 503);
      if (url.includes("openrouter.ai")) return jsonResponse(null, false, 429);
      if (url.includes("cloudflare.com")) return jsonResponse({ result: { response: "a lesson from cloudflare" } });
      throw new Error(`unexpected url: ${url}`);
    });
    const { callAI } = await import("./ai");
    const result = await callAI("teach me quadratics", 500, { skipCurriculumGrounding: true, curriculumContext: "" });
    expect(result).toBe("a lesson from cloudflare");
    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls).toEqual([
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      "https://openrouter.ai/api/v1/chat/completions",
      expect.stringContaining("cloudflare.com"),
    ]);
  });

  it("skips OpenRouter for multimodal requests (media-aware providers only)", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("GEMINI_API_KEY", "g-key");
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("generativelanguage.googleapis.com")) return jsonResponse({ candidates: [{ content: { parts: [{ text: "a lesson from gemini with the image" }] } }] });
      throw new Error(`unexpected url for multimodal request: ${url}`);
    });
    const { callAI } = await import("./ai");
    const result = await callAI("describe this diagram", 500, {
      skipCurriculumGrounding: true,
      curriculumContext: "",
      media: [{ mimeType: "image/png", data: "AAAA" }],
    });
    expect(result).toBe("a lesson from gemini with the image");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain("https://openrouter.ai/api/v1/chat/completions");
  });
});
