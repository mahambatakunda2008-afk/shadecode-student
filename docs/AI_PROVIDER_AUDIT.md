# Existing AI provider audit and smoke test

## Purpose

Shadecode Student already has a bounded AI fallback chain in `src/lib/ai.ts`. This audit step does not add providers or change the production routing order. It gives the team a safe way to check which existing providers are configured and can complete a tiny text-generation request.

## Run a smoke test

From the repository root, with the same environment variables used by the app:

```bash
node scripts/ai-provider-smoke-test.mjs
```

Optional settings:

- `AI_SMOKE_TIMEOUT_MS`: request timeout per provider in milliseconds (default: `7000`).
- `AI_SMOKE_STRICT=true`: return a non-zero exit code if a configured provider fails.
- `AI_GATEWAY_MODEL` and `AI_GATEWAY_FALLBACK_MODELS`: same model settings used by the application.
- `CLOUDFLARE_ACCOUNT_ID`: overrides the existing account-ID fallback.
- `OLLAMA_BASE_URL` and `OLLAMA_MODEL`: opt in to testing a local Ollama instance.

The script checks Vercel AI Gateway, Groq, OpenRouter, Cloudflare Workers AI, Google Gemini, and optionally Ollama. It skips providers without credentials/settings. It never prints API keys, authorization headers, or full provider response bodies.

**Run it locally or in a trusted environment only. Do not paste API keys into issues, pull requests, chat, or terminal screenshots.** This script sends a short educational prompt to each configured provider and may consume a small amount of provider quota.

## Interpret results

- `PASS`: request returned a nonempty response above the minimum length.
- `FAIL`: configured route failed, timed out, or returned an unusable response.
- `SKIP`: the corresponding provider is not configured in the current shell.

A passing result proves only that one request worked at that moment. It does not prove a provider will be reliable under load, that all models in a fallback list work, or that its output is curriculum-correct.

## Existing routing found in `src/lib/ai.ts`

The current code contains these routes:

1. Optional local Ollama when explicitly configured/preferred.
2. Vercel AI Gateway when `AI_GATEWAY_API_KEY` exists.
3. Groq when `GROQ_API_KEY` exists.
4. OpenRouter when `OPENROUTER_API_KEY` exists.
5. Cloudflare Workers AI when `CLOUDFLARE_API_TOKEN` exists.
6. Gemini using `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, and `GEMINI_API_KEY_3`.
7. OpenAI only when `ALLOW_PAID_AI=true` and `OPENAI_API_KEY` are both set.

Multimodal requests deliberately skip providers whose current request implementations are text-only.

## Next diagnostic sequence

1. Run this smoke test and record provider names/status/latency only, never credentials.
2. Check deployment logs for the actual lesson-generation failure and correlate the request ID/time with provider telemetry.
3. Separate inference failures from output-validation, lesson-persistence, and task-state failures.
4. Add or change production routing only after evidence identifies the cause.
5. Re-run the app's normal verification command (`npm run verify`) in a local checkout before merging.

This document and script are diagnostic additions; they do not assert that any provider is currently configured in Vercel or that lesson generation is fixed.
