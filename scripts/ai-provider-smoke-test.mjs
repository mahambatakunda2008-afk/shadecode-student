#!/usr/bin/env node
/**
 * Safe, low-cost smoke test for the AI providers already supported by Shadecode Student.
 *
 * Run from the repository root after setting the same environment variables used by the app:
 *   node scripts/ai-provider-smoke-test.mjs
 *
 * This script never prints API keys, authorization headers, full prompts, or provider response bodies.
 * It makes one short request per configured provider (Gemini may try its configured model list).
 */

const TIMEOUT_MS = Number.parseInt(process.env.AI_SMOKE_TIMEOUT_MS || "7000", 10);
const PROMPT = "In two concise sentences, explain the difference between transverse and longitudinal waves.";
const MAX_TOKENS = 120;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "6a119f6052c02197d301e50f0d4a56cc";

function configured(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* invalid JSON is reported as unusable */ }
    return { response, data, elapsedMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function usable(text) {
  return typeof text === "string" && text.trim().length > 20;
}

function report(name, result) {
  const suffix = result.model ? ` model=${result.model}` : "";
  const latency = Number.isFinite(result.elapsedMs) ? ` ${result.elapsedMs}ms` : "";
  const status = result.ok ? "PASS" : result.skipped ? "SKIP" : "FAIL";
  const details = result.reason ? ` reason=${result.reason}` : "";
  console.log(`[${status}] ${name}${suffix}${latency}${details}`);
  return result;
}

async function test(name, isConfigured, run) {
  if (!isConfigured) return report(name, { skipped: true, reason: "not configured" });
  try {
    const result = await run();
    return report(name, result);
  } catch (error) {
    const reason = error?.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : "network or request error";
    return report(name, { ok: false, reason });
  }
}

const results = [];

results.push(await test("Vercel AI Gateway", configured("AI_GATEWAY_API_KEY"), async () => {
  const model = process.env.AI_GATEWAY_MODEL?.trim() || "inclusionai/ling-3.0-flash-free";
  const fallbacks = (process.env.AI_GATEWAY_FALLBACK_MODELS?.trim() || "stealth/pixel-canary")
    .split(",").map(value => value.trim()).filter(Boolean);
  const { response, data, elapsedMs } = await postJson(
    "https://ai-gateway.vercel.sh/v1/chat/completions",
    { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` },
    {
      model,
      messages: [{ role: "user", content: PROMPT }],
      max_tokens: MAX_TOKENS,
      ...(fallbacks.length ? { providerOptions: { gateway: { models: fallbacks } } } : {}),
    },
  );
  const text = data?.choices?.[0]?.message?.content;
  return { ok: response.ok && usable(text), model, elapsedMs, reason: !response.ok ? `HTTP ${response.status}` : !usable(text) ? "empty or unusable response" : undefined };
}));

results.push(await test("Groq", configured("GROQ_API_KEY"), async () => {
  const model = "llama-3.3-70b-versatile";
  const { response, data, elapsedMs } = await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    { model, messages: [{ role: "user", content: PROMPT }], max_tokens: MAX_TOKENS },
  );
  const text = data?.choices?.[0]?.message?.content;
  return { ok: response.ok && usable(text), model, elapsedMs, reason: !response.ok ? `HTTP ${response.status}` : !usable(text) ? "empty or unusable response" : undefined };
}));

results.push(await test("OpenRouter", configured("OPENROUTER_API_KEY"), async () => {
  const model = "openrouter/free";
  const { response, data, elapsedMs } = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "HTTP-Referer": "https://shadecodestudent.vercel.app", "X-Title": "Shadecode Student smoke test" },
    { model, messages: [{ role: "user", content: PROMPT }], max_tokens: MAX_TOKENS },
  );
  const text = data?.choices?.[0]?.message?.content;
  return { ok: response.ok && usable(text), model, elapsedMs, reason: !response.ok ? `HTTP ${response.status}` : !usable(text) ? "empty or unusable response" : undefined };
}));

results.push(await test("Cloudflare Workers AI", configured("CLOUDFLARE_API_TOKEN"), async () => {
  const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const { response, data, elapsedMs } = await postJson(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
    { messages: [{ role: "user", content: PROMPT }], max_tokens: MAX_TOKENS },
  );
  const text = data?.result?.response;
  return { ok: response.ok && data?.success !== false && usable(text), model, elapsedMs, reason: !response.ok ? `HTTP ${response.status}` : !usable(text) ? "empty or unusable response" : undefined };
}));

results.push(await test("Google Gemini", ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"].some(configured), async () => {
  const keys = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"].map(name => process.env[name]).filter(Boolean);
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];
  const failures = [];
  for (const key of keys) {
    for (const model of models) {
      try {
        const { response, data, elapsedMs } = await postJson(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {},
          { contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.2 } },
        );
        const text = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || "").join("");
        if (response.ok && usable(text)) return { ok: true, model, elapsedMs };
        failures.push(response.ok ? "unusable response" : `HTTP ${response.status}`);
      } catch (error) {
        failures.push(error?.name === "AbortError" ? "timeout" : "network or request error");
      }
    }
  }
  return { ok: false, reason: failures[0] || "no usable model response" };
}));

results.push(await test("Local Ollama", configured("OLLAMA_BASE_URL"), async () => {
  const base = process.env.OLLAMA_BASE_URL.replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
  const { response, data, elapsedMs } = await postJson(
    `${base}/api/chat`,
    {},
    { model, messages: [{ role: "user", content: PROMPT }], stream: false, options: { temperature: 0.2, num_predict: MAX_TOKENS } },
  );
  const text = data?.message?.content;
  return { ok: response.ok && usable(text), model, elapsedMs, reason: !response.ok ? `HTTP ${response.status}` : !usable(text) ? "empty or unusable response" : undefined };
}));

const passed = results.filter(result => result.ok).length;
const failed = results.filter(result => !result.ok && !result.skipped).length;
const skipped = results.filter(result => result.skipped).length;
console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} not configured.`);
console.log("This is a connectivity smoke test, not a benchmark of educational correctness.");
if (process.env.AI_SMOKE_STRICT === "true" && failed > 0) process.exitCode = 1;
