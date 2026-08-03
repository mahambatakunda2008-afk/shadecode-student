// src/lib/ai.ts
//
// Unified AI caller — the SINGLE source of truth for calling the AI
// provider fallback chain (Cloudflare -> Gemini -> OpenAI -> OpenRouter).
// OpenAI sits after Gemini deliberately: it's unfunded and expected to
// 429, so it shouldn't eat a timeout window on every request before the
// chain reaches a provider that actually works.
//
// This consolidates what used to be 6 separate, drifting copies of this
// logic across the codebase (src/lib/ai.ts, src/app/api/exam/generate,
// src/app/api/exam/mark, src/app/api/learn, src/app/api/learn/quiz,
// src/app/api/learn/providers.ts, src/lib/cortex/generateCourse.ts).
// Fix a provider, a model name, or a timeout here -- everything benefits.

import { logAIUsage } from "@/lib/ai/tracker";

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "6a119f6052c02197d301e50f0d4a56cc";
const PROVIDER_TIMEOUT_MS = 15000;

export interface CallAIOptions {
  /** Supabase user id, for usage tracking / rate limiting. */
  userId?: string;
  /** High-level feature name for analytics, e.g. 'lesson_assistant', 'exam_sim'. */
  feature?: string;
  /** Specific action within the feature, e.g. 'generate_lesson', 'mark_exam'. */
  subfeature?: string;
}

function fetchWithTimeout(url: string, options: RequestInit, timeout = PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

/**
 * Call the AI provider fallback chain. Tries each configured provider in
 * order and returns the first usable text response, or null if every
 * provider is unavailable, errors, times out, or returns junk.
 *
 * Callers are responsible for their own fallback CONTENT (e.g. a static
 * template) when this returns null -- this function only handles provider
 * availability, not content generation failures.
 */
export async function callAI(
  prompt: string,
  maxTokens = 2000,
  options: CallAIOptions = {}
): Promise<string | null> {
  const { userId, feature = "ai_assistant", subfeature = "generate" } = options;
  const promptTokens = Math.ceil(prompt.length / 4);

  // A flat 15s timeout was killing every provider on large generations --
  // exam generation asks for 6000 tokens, lessons ask for 4000. At normal
  // free-tier generation speed that routinely exceeds 15s, so every
  // provider aborted in sequence and the chain reported "exhausted" even
  // when the providers themselves were healthy. Scale the budget to the
  // actual request size instead, with sane floor/ceiling.
  const timeoutMs = Math.min(55000, Math.max(20000, maxTokens * 6));

  async function logResult(params: {
    provider: string;
    model: string;
    startTime: number;
    success: boolean;
    text?: string;
    err?: unknown;
  }) {
    const { provider, model, startTime, success, text, err } = params;
    const latencyMs = Date.now() - startTime;
    try {
      await logAIUsage({
        userId,
        feature,
        subfeature,
        provider,
        model,
        promptTokens,
        completionTokens: text ? Math.ceil(text.length / 4) : 0,
        latencyMs,
        success,
        errorMessage: err instanceof Error ? err.message : err ? String(err) : undefined,
        errorCode: err instanceof Error ? err.constructor.name : undefined,
        requestMetadata: { promptLength: prompt.length, maxTokens },
      });
    } catch {
      // Usage tracking must never break generation.
    }
  }

  // 1. Cloudflare Workers AI (primary -- free, no limits)
  if (process.env.CLOUDFLARE_API_TOKEN) {
    const startTime = Date.now();
    const model = "llama-3.3-70b-instruct-fp8-fast";
    try {
      const res = await fetchWithTimeout(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
        },
        timeoutMs
      );
      const data = (await res.json()) as any;
      const text = typeof data?.result?.response === "string" ? data.result.response : null;
      if (text && text.length > 20) {
        await logResult({ provider: "cloudflare", model, startTime, success: true, text });
        return text;
      }
    } catch (err) {
      await logResult({ provider: "cloudflare", model, startTime, success: false, err });
      console.error("[AI] Cloudflare failed:", err);
    }
  }

  // 2. Gemini -- all configured keys x both models (free tier, primary fallback)
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  // gemini-2.0-flash is permanently zero-quota on this Google account
  // (all 3 keys share one quota pool) -- trying it is a guaranteed
  // wasted round-trip, not a real fallback. 2.5-flash only.
  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash"]) {
      const startTime = Date.now();
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
            }),
          },
          timeoutMs
        );
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.length > 20) {
          await logResult({ provider: "gemini", model, startTime, success: true, text });
          return text;
        }
      } catch (err) {
        await logResult({ provider: "gemini", model, startTime, success: false, err });
        console.error(`[AI] Gemini (${model}) failed:`, err);
      }
    }
  }

  // 3. OpenAI (last resort -- unfunded, expect 429s; JSON mode if it ever works)
  if (process.env.OPENAI_API_KEY) {
    const startTime = Date.now();
    const model = "gpt-4o-mini";
    try {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      }, timeoutMs);
      const data = (await res.json()) as any;
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 20) {
        await logResult({ provider: "openai", model, startTime, success: true, text });
        return text;
      }
    } catch (err) {
      await logResult({ provider: "openai", model, startTime, success: false, err });
      console.error("[AI] OpenAI failed:", err);
    }
  }

  // 4. OpenRouter -- free Llama fallback of last resort
  if (process.env.OPENROUTER_API_KEY) {
    const startTime = Date.now();
    const model = "llama-3.3-70b-instruct";
    try {
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
          "X-Title": "Shadecode Student",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
        }),
      }, timeoutMs);
      const data = (await res.json()) as any;
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 20) {
        await logResult({ provider: "openrouter", model, startTime, success: true, text });
        return text;
      }
    } catch (err) {
      await logResult({ provider: "openrouter", model, startTime, success: false, err });
      console.error("[AI] OpenRouter failed:", err);
    }
  }

  console.error("[AI] All providers exhausted.");
  return null;
}
