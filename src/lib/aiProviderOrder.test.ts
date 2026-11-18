import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ai.ts", import.meta.url), "utf8");

describe("AI provider fallback order", () => {
  it("tries the Gateway, then Gemini, then the independent free-provider lanes, then paid OpenAI", () => {
    const positions = [
      source.indexOf('tryProvider("vercel-ai-gateway"'),
      source.indexOf('tryProvider("gemini"'),
      source.indexOf('tryProvider("groq"'),
      source.indexOf('tryProvider("openrouter"'),
      source.indexOf('tryProvider("cloudflare"'),
      source.indexOf('tryProvider("openai"'),
    ];

    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
