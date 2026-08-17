// Unified AI caller: one bounded provider fallback chain for every AI feature.
import { logAIUsage } from "@/lib/ai/tracker";

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "6a119f6052c02197d301e50f0d4a56cc";
const DEFAULT_MAX_CHAIN_MS = 55000;
const DEFAULT_PER_PROVIDER_MAX_MS = 14000;

export interface CallAIOptions {
  userId?: string;
  feature?: string;
  subfeature?: string;
  /** Total wall-clock budget for the entire provider fallback chain. */
  maxChainMs?: number;
  /** Maximum time allowed for one provider attempt. */
  perProviderMaxMs?: number;
}

function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeout));
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function callAI(prompt: string, maxTokens = 2000, options: CallAIOptions = {}): Promise<string | null> {
  const {
    userId,
    feature = "ai_assistant",
    subfeature = "generate",
  } = options;
  const maxChainMs = Math.max(3000, Math.min(options.maxChainMs ?? DEFAULT_MAX_CHAIN_MS, DEFAULT_MAX_CHAIN_MS));
  const perProviderMaxMs = Math.max(1000, Math.min(options.perProviderMaxMs ?? DEFAULT_PER_PROVIDER_MAX_MS, maxChainMs));
  const promptTokens = Math.ceil(prompt.length / 4);
  const startedAt = Date.now();

  async function logResult(params: { provider: string; model: string; startTime: number; success: boolean; text?: string; err?: unknown }) {
    try {
      await logAIUsage({ userId, feature, subfeature, provider: params.provider, model: params.model, promptTokens, completionTokens: params.text ? Math.ceil(params.text.length / 4) : 0, latencyMs: Date.now() - params.startTime, success: params.success, errorMessage: params.err instanceof Error ? params.err.message : params.err ? String(params.err) : undefined, errorCode: params.err instanceof Error ? params.err.constructor.name : undefined, requestMetadata: { promptLength: prompt.length, maxTokens, maxChainMs, perProviderMaxMs } });
    } catch {}
  }

  const remaining = () => Math.max(0, maxChainMs - (Date.now() - startedAt));
  const providerTimeout = () => Math.min(perProviderMaxMs, remaining());
  const canTry = () => remaining() >= 1000;

  async function tryProvider(provider: string, model: string, request: (timeout: number) => Promise<string | null>): Promise<string | null> {
    if (!canTry()) return null;
    const startTime = Date.now();
    try {
      const text = await request(providerTimeout());
      if (text && text.trim().length > 20) {
        await logResult({ provider, model, startTime, success: true, text });
        return text;
      }
      await logResult({ provider, model, startTime, success: false, err: "Empty or unusable AI response" });
    } catch (err) {
      await logResult({ provider, model, startTime, success: false, err });
      console.error(`[AI] ${provider} failed:`, err);
    }
    return null;
  }

  if (process.env.CLOUDFLARE_API_TOKEN && canTry()) {
    const text = await tryProvider("cloudflare", "llama-3.3-70b-instruct-fp8-fast", async timeout => {
      const res = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }) }, timeout);
      if (!res.ok) throw new Error(`Cloudflare HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.result?.response === "string" ? data.result.response : null;
    });
    if (text) return text;
  }

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
  for (const key of geminiKeys) {
    if (!canTry()) break;
    const text = await tryProvider("gemini", "gemini-2.5-flash", async timeout => {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" } }) }, timeout);
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.candidates?.[0]?.content?.parts?.[0]?.text === "string" ? data.candidates[0].content.parts[0].text : null;
    });
    if (text) return text;
  }

  if (process.env.OPENAI_API_KEY && canTry()) {
    const text = await tryProvider("openai", "gpt-4o-mini", async timeout => {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: maxTokens, response_format: { type: "json_object" } }) }, timeout);
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : null;
    });
    if (text) return text;
  }

  if (process.env.OPENROUTER_API_KEY && canTry()) {
    const text = await tryProvider("openrouter", "meta-llama/llama-3.3-70b-instruct:free", async timeout => {
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://shadecodestudent.vercel.app", "X-Title": "Shadecode Student" }, body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }) }, timeout);
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : null;
    });
    if (text) return text;
  }

  console.error(`[AI] Provider chain exhausted within ${maxChainMs}ms.`);
  return null;
}
