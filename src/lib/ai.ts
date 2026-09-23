// Unified AI caller: bounded provider fallback chain with optional local Ollama inference.
// Local inference is available for desktop/dev builds; the zero-cost cloud chain remains the production fallback.
import { logAIUsage } from "@/lib/ai/tracker";
import { getVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "6a119f6052c02197d301e50f0d4a56cc";
const DEFAULT_MAX_CHAIN_MS = 28000;
const DEFAULT_PER_PROVIDER_MAX_MS = 6500;
const TELEMETRY_BUDGET_MS = 500;
const ALLOW_PAID_AI = process.env.ALLOW_PAID_AI === "true";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export interface CallAIOptions {
  userId?: string;
  feature?: string;
  subfeature?: string;
  maxChainMs?: number;
  perProviderMaxMs?: number;
  preferLocal?: boolean;
  /** Pre-resolved verified curriculum context. Prevents a second DB lookup in the same request. */
  curriculumContext?: string;
  /** The caller has already resolved and embedded curriculum grounding in its prompt. */
  skipCurriculumGrounding?: boolean;
  /** Optional multimodal inputs. Only providers with verified media support receive these parts. */
  media?: Array<{ mimeType: string; data: string }>;
}

function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeout));
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function callAI(prompt: string, maxTokens = 2000, options: CallAIOptions = {}): Promise<string | null> {
  const { userId, feature = "ai_assistant", subfeature = "generate", media = [] } = options;
  const maxChainMs = Math.max(3000, Math.min(options.maxChainMs ?? DEFAULT_MAX_CHAIN_MS, 60000));
  const perProviderMaxMs = Math.max(1000, Math.min(options.perProviderMaxMs ?? DEFAULT_PER_PROVIDER_MAX_MS, maxChainMs));
  let groundedPrompt = prompt;
  let curriculumGroundingAvailable = false;
  let curriculumGroundingReason = "not requested";

  if (options.skipCurriculumGrounding) {
    curriculumGroundingAvailable = options.curriculumContext?.trim().length ? true : prompt.includes("VERIFIED CURRICULUM CONTEXT:") && !prompt.includes("No verified curriculum context was returned");
    curriculumGroundingReason = curriculumGroundingAvailable ? "provided-in-prompt" : "skipped";
  } else if (options.curriculumContext !== undefined) {
    const curriculumContext = options.curriculumContext;
    const promptAlreadyGrounded = prompt.includes("VERIFIED CURRICULUM CONTEXT:");
    curriculumGroundingAvailable = curriculumContext.trim().length > 0 || (promptAlreadyGrounded && !prompt.includes("No verified curriculum context was returned"));
    curriculumGroundingReason = curriculumGroundingAvailable ? (promptAlreadyGrounded ? "provided-in-prompt" : "provided") : "unavailable";
    if (!promptAlreadyGrounded) {
      groundedPrompt = curriculumGroundingAvailable
        ? `${prompt}${curriculumContext}`
        : `${prompt}\n\n=== CURRICULUM SAFETY NOTE ===\nNo verified board-specific curriculum context was available. Do not claim board-specific syllabus alignment, required scope, terminology, or assessment style. Teach the requested topic as general educational material.\n=== END CURRICULUM SAFETY NOTE ===`;
    }
  } else if (userId) {
    try {
      const curriculumContext = await getVerifiedCurriculumPromptContext(userId, prompt);
      curriculumGroundingAvailable = curriculumContext.trim().length > 0;
      curriculumGroundingReason = curriculumGroundingAvailable ? "resolved" : "unavailable";
      groundedPrompt = curriculumGroundingAvailable
        ? `${prompt}${curriculumContext}`
        : `${prompt}\n\n=== CURRICULUM SAFETY NOTE ===\nNo verified board-specific curriculum context was available. Do not claim board-specific syllabus alignment, required scope, terminology, or assessment style. Teach the requested topic as general educational material.\n=== END CURRICULUM SAFETY NOTE ===`;
    } catch (error) {
      curriculumGroundingReason = "lookup_error";
      console.error("[AI] curriculum grounding failed:", error);
      groundedPrompt = `${prompt}\n\n=== CURRICULUM SAFETY NOTE ===\nVerified curriculum context could not be loaded. Do not claim board-specific syllabus alignment or invent syllabus objectives.\n=== END CURRICULUM SAFETY NOTE ===`;
    }
  }

  const promptTokens = Math.ceil(groundedPrompt.length / 4);
  const startedAt = Date.now();
  function logResult(params: { provider: string; model: string; startTime: number; success: boolean; text?: string; err?: unknown }) {
    const telemetry = logAIUsage({ userId, feature, subfeature, provider: params.provider, model: params.model, promptTokens, completionTokens: params.text ? Math.ceil(params.text.length / 4) : 0, latencyMs: Date.now() - params.startTime, success: params.success, errorMessage: params.err instanceof Error ? params.err.message : params.err ? String(params.err) : undefined, errorCode: params.err instanceof Error ? params.err.constructor.name : undefined, requestMetadata: { promptLength: groundedPrompt.length, maxTokens, maxChainMs, perProviderMaxMs, curriculumGrounding: curriculumGroundingAvailable, curriculumGroundingReason } });
    void Promise.race([telemetry.catch(() => undefined), new Promise<void>(resolve => setTimeout(resolve, TELEMETRY_BUDGET_MS))]);
  }

  const remaining = () => Math.max(0, maxChainMs - (Date.now() - startedAt));
  const providerTimeout = () => Math.min(perProviderMaxMs, remaining());
  const canTry = () => remaining() >= 1000;
  // Grace period on top of the provider's declared budget before the hard race below gives up on it.
  const HARD_TIMEOUT_GRACE_MS = 250;
  async function tryProvider(provider: string, model: string, request: (timeout: number) => Promise<string | null>): Promise<string | null> {
    if (!canTry()) return null;
    const startTime = Date.now();
    const timeout = providerTimeout();
    // Hard race, independent of the request's own timeout/AbortController: some providers do not
    // reliably honor an AbortSignal once the response body starts streaming (observed in production
    // with OpenRouter: calls completed successfully after 30-49 seconds against a declared 6.5-9s
    // budget, pushing the whole chain past the route's maxDuration and getting the request killed by
    // the platform with no response to the user at all). This guarantees tryProvider itself always
    // settles within `timeout` plus a small grace period, whatever the underlying request does; an
    // abandoned request's eventual result, if any, is simply discarded.
    let hardTimedOut = false;
    const hardTimeout = new Promise<null>(resolve => {
      setTimeout(() => { hardTimedOut = true; resolve(null); }, timeout + HARD_TIMEOUT_GRACE_MS);
    });
    try {
      const text = await Promise.race([request(timeout), hardTimeout]);
      if (hardTimedOut) {
        logResult({ provider, model, startTime, success: false, err: new Error(`Hard timeout: provider did not respond within its ${timeout}ms budget`) });
        return null;
      }
      if (text && text.trim().length > 20) { logResult({ provider, model, startTime, success: true, text }); return text; }
      logResult({ provider, model, startTime, success: false, err: "Empty or unusable AI response" });
    } catch (err) {
      logResult({ provider, model, startTime, success: false, err });
      console.error(`[AI] ${provider} failed:`, err);
    }
    return null;
  }

  // Optional local Ollama path. If Ollama is unavailable, fail fast and continue to cloud providers.
  if ((options.preferLocal || OLLAMA_BASE_URL) && OLLAMA_BASE_URL && canTry()) {
    const text = await tryProvider("ollama", OLLAMA_MODEL, async timeout => {
      const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: "user", content: groundedPrompt }], stream: false, format: "json", options: { temperature: 0.25, num_predict: maxTokens } }),
      }, Math.min(timeout, 3500));
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.message?.content === "string" ? data.message.content : null;
    });
    if (text) return text;
  }

  // Production text generation goes through Vercel AI Gateway first. This removes
  // provider-specific roulette from the application and lets the gateway fail over
  // when an inference provider is degraded. The model ID is a stable Google Gemini
  // endpoint, not a preview/latest alias.
  if (!media.length && process.env.AI_GATEWAY_API_KEY && canTry()) {
    const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || "google/gemini-3.8-flash";
    const text = await tryProvider("vercel-ai-gateway", gatewayModel, async timeout => {
      const res = await fetchWithTimeout("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: gatewayModel,
          messages: [{ role: "user", content: groundedPrompt }],
          max_tokens: maxTokens,
        }),
      }, timeout);
      if (!res.ok) throw new Error(`AI Gateway HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
      const data = await res.json() as any;
      return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : null;
    });
    if (text) return text;
  }

  // OpenRouter's free tier is currently the only provider with a proven production success
  // rate (see ai_usage_logs 2026-09-19/20: ~64% vs Gemini's 0% and Cloudflare's 0% over the
  // same window). Keep it as a real fallback after the Gateway attempt, not just Cloudflare/
  // Gemini/OpenAI, until Gateway is confirmed working end-to-end in production.
  if (!media.length && process.env.OPENROUTER_API_KEY && canTry()) {
    const text = await tryProvider("openrouter", "openrouter/free", async timeout => {
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
          "X-Title": "Shadecode Student",
        },
        body: JSON.stringify({ model: "openrouter/free", messages: [{ role: "user", content: groundedPrompt }], max_tokens: maxTokens }),
      }, timeout);
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : null;
    });
    if (text) return text;
  }

  if (!media.length && process.env.CLOUDFLARE_API_TOKEN && canTry()) {
    const text = await tryProvider("cloudflare", "llama-3.3-70b-instruct-fp8-fast", async timeout => {
      const res = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
        method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: groundedPrompt }], max_tokens: maxTokens }),
      }, timeout);
      if (!res.ok) throw new Error(`Cloudflare HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.result?.response === "string" ? data.result.response : null;
    });
    if (text) return text;
  }

  // Direct Google fallback remains deliberately small and stable. Do not add
  // preview/experimental/latest aliases here. Secondary keys cover quota buckets.
  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
  const geminiModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"];

  async function callGemini(key: string, model: string): Promise<string | null> {
    return tryProvider("gemini", model, async timeout => {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: groundedPrompt },
              ...media.slice(0, 4).map(part => ({ inlineData: { mimeType: part.mimeType, data: part.data } })),
            ],
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.35 },
        }),
      }, Math.min(timeout, 6500));
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
      const data = await res.json() as any;
      return typeof data?.candidates?.[0]?.content?.parts?.[0]?.text === "string" ? data.candidates[0].content.parts[0].text : null;
    });
  }

  // Text fallback order after Gateway: OpenRouter (proven reliable), then Cloudflare, then
  // stable Gemini models, then paid OpenAI only when explicitly enabled.
  for (const key of geminiKeys) {
    for (const model of geminiModels) {
      if (!canTry()) break;
      const text = await callGemini(key, model);
      if (text) return text;
    }
    if (!canTry()) break;
  }

  if (!media.length && ALLOW_PAID_AI && process.env.OPENAI_API_KEY && canTry()) {
    const text = await tryProvider("openai", "gpt-5.5", async timeout => {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-5.5", messages: [{ role: "user", content: groundedPrompt }], max_tokens: maxTokens }),
      }, timeout);
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const data = await res.json() as any;
      return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : null;
    });
    if (text) return text;
  }

  console.error(`[AI] Provider chain exhausted within ${maxChainMs}ms.`);
  return null;
}
