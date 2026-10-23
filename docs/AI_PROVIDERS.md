# AI providers: setup and diagnosis

Learn works without any AI (curated lessons, library, syllabus guide, engine practice). AI adds richer
explanations when a provider is reachable. This page covers keeping a provider working and diagnosing failures.

## Why providers looked "dead" (2026-10)

`ai_usage_logs` (30 days) showed Cloudflare **succeeding** (short answers, 3.5-5.9 s) and failing 273 times with
"This operation was aborted" at ~6 s: the app's own per-provider timeout (6 s) cut healthy providers off mid-answer
for section-sized output (~1,500 tokens). Aborts also trip the circuit breaker, which then skips the provider for 90 s.
Gemini failed in ~100 ms (permission denied: a real rejection). Groq was never configured.

Fix: lesson sections now opt in to `shareChainBudget` (see `src/lib/ai.ts`), so a working provider can use an equal
share of a 32 s first-attempt budget instead of a fixed 6 s. Worst case per request is 32 + 16 + 16 = 64 s, below the
client's 72 s wait and the route's 90 s `maxDuration` (guarded by `src/app/api/learn/sectionBudget.test.ts`).

## Cloudflare Workers AI (free tier)

Environment variables (Vercel project settings, then redeploy):

| Variable | Required | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | yes | API token with Workers AI permission (use the Workers AI template, or a custom token with Account > Workers AI). |
| `CLOUDFLARE_ACCOUNT_ID` | yes, set it explicitly | The code has a built-in fallback account id; set yours so requests never go to a different account. |
| `CLOUDFLARE_AI_MODEL` | no | Defaults to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Must look like `@cf/vendor/model`. |
| `CLOUDFLARE_AI_FALLBACK_MODEL` | no | Tried only if the first model fails (for example a smaller model when the free allowance is used up). |

Free allowance (Cloudflare pricing page): **10,000 neurons/day on the free plan, reset 00:00 UTC.** The 70B model costs
about 205,000 neurons per million output tokens, so one 1,500-token section is roughly 360 neurons: about 27 sections
a day, or 4 to 5 whole lessons. A smaller model stretches this a lot. Cloudflare retires models over time, so pick the
fallback model from the current catalogue in your Cloudflare dashboard rather than copying a name from a blog.

## Reading the logs

```sql
select provider, success, count(*) n,
       percentile_cont(0.5) within group (order by latency_ms)::int as p50_ms,
       left(max(error_message), 140) as sample_error
from ai_usage_logs
where created_at > now() - interval '1 day'
group by provider, success order by provider, success;
```

| What you see | Meaning |
| --- | --- |
| `This operation was aborted` / `Hard timeout` | The app's timeout fired. Provider may be healthy but slow. |
| `Cloudflare HTTP 429: 4006 ... daily free allocation` | Free neurons used up. Resets at 00:00 UTC; set a smaller fallback model. |
| `Cloudflare HTTP 401/403` | Wrong token, or `CLOUDFLARE_ACCOUNT_ID` does not match the token's account. |
| Failures with p50 around 100 ms | Immediate rejection (permission denied, bad key). Not a timeout problem. |
