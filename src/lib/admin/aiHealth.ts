/**
 * src/lib/admin/aiHealth.ts
 *
 * Reliability of AI generation, per feature, from ai_usage_logs. Each row is one
 * PROVIDER ATTEMPT in a fallback chain, so "attempts" overstate how many requests
 * students made; the success rate still shows how often an attempt works and
 * how long students sit through failures.
 */

export interface AiLogRow {
  feature: string | null;
  success: boolean | null;
  user_id: string | null;
  error_message?: string | null;
  latency_ms?: number | null;
  created_at: string;
}

export interface AiFeatureHealth {
  feature: string;
  attempts: number;
  succeeded: number;
  successPct: number | null;
  students: number;
  /** Students who had at least one attempt but no successful one in the window. */
  studentsWithoutSuccess: number;
  avgFailSeconds: number | null;
  topFailure: string | null;
  lastAttempt: string | null;
}

/** Collapses variable details (numbers, ids, long JSON) so equal failures group together. */
export function normalizeFailure(message: string | null | undefined): string {
  const first = (message ?? "").split("\n")[0].replace(/\s+/g, " ").trim();
  if (!first) return "unknown error";
  return first.replace(/\d+(\.\d+)?/g, "N").replace(/[{[].*$/, "").trim().slice(0, 70) || "unknown error";
}

export function summarizeAiHealth(rows: readonly AiLogRow[], now: Date = new Date(), windowDays = 7): AiFeatureHealth[] {
  const since = now.getTime() - windowDays * 86_400_000;
  const byFeature = new Map<string, { attempts: number; ok: number; users: Set<string>; okUsers: Set<string>; failMs: number[]; failures: Map<string, number>; last: number }>();
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (!Number.isFinite(t) || t < since || !r.feature) continue;
    const f = byFeature.get(r.feature) ?? { attempts: 0, ok: 0, users: new Set<string>(), okUsers: new Set<string>(), failMs: [], failures: new Map<string, number>(), last: 0 };
    f.attempts += 1;
    f.last = Math.max(f.last, t);
    if (r.user_id) f.users.add(r.user_id);
    if (r.success) {
      f.ok += 1;
      if (r.user_id) f.okUsers.add(r.user_id);
    } else {
      if (typeof r.latency_ms === "number" && r.latency_ms >= 0) f.failMs.push(r.latency_ms);
      const key = normalizeFailure(r.error_message);
      f.failures.set(key, (f.failures.get(key) ?? 0) + 1);
    }
    byFeature.set(r.feature, f);
  }
  return [...byFeature.entries()]
    .map(([feature, f]): AiFeatureHealth => {
      const top = [...f.failures.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        feature,
        attempts: f.attempts,
        succeeded: f.ok,
        successPct: f.attempts ? Math.round((f.ok / f.attempts) * 100) : null,
        students: f.users.size,
        studentsWithoutSuccess: [...f.users].filter((u) => !f.okUsers.has(u)).length,
        avgFailSeconds: f.failMs.length ? Math.round((f.failMs.reduce((a, b) => a + b, 0) / f.failMs.length) / 100) / 10 : null,
        topFailure: top ? `${top[0]} (${top[1]}×)` : null,
        lastAttempt: f.last ? new Date(f.last).toISOString() : null,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);
}
