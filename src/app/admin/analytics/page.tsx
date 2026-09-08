"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TractionEvent = {
  user_id: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  name: string;
  path: string | null;
  created_at: string;
};

const DAY = 24 * 60 * 60 * 1000;

function dayKey(value: string) { return new Date(value).toISOString().slice(0, 10); }
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function uniqueUsers(events: TractionEvent[], from: number, to = Date.now()) {
  return new Set(events.filter((e) => { const t = new Date(e.created_at).getTime(); return t >= from && t < to; }).map((e) => e.user_id).filter(Boolean)).size;
}

export default function AdminAnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<TractionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const since = new Date(Date.now() - 90 * DAY).toISOString();
    const { data, error: queryError } = await supabase
      .from("traction_events")
      .select("user_id, anonymous_id, session_id, name, path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (queryError) setError(queryError.message);
    else setEvents((data ?? []) as TractionEvent[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const today = startOfToday().getTime();
    const dau = uniqueUsers(events, today, now + 1);
    const wau = uniqueUsers(events, now - 7 * DAY);
    const mau = uniqueUsers(events, now - 30 * DAY);
    const firstSeen = new Map<string, number>();
    for (const event of events) {
      if (!event.user_id) continue;
      const t = new Date(event.created_at).getTime();
      const previous = firstSeen.get(event.user_id);
      if (previous === undefined || t < previous) firstSeen.set(event.user_id, t);
    }
    const newUsers = [...firstSeen.values()].filter((t) => t >= now - 30 * DAY).length;
    const returningUsers = [...new Set(events.filter((e) => e.user_id && new Date(e.created_at).getTime() >= now - 30 * DAY).map((e) => e.user_id!))].filter((id) => (firstSeen.get(id) ?? now) < now - 30 * DAY).length;
    const names = ["user_signed_up", "user_logged_in", "learning_session_started", "lesson_generated", "lesson_completed", "exam_started", "exam_completed", "math_check_used", "task_completed", "daily_challenge_completed"];
    const featureUsage = names.map((name) => ({ name, count: events.filter((e) => e.name === name).length })).sort((a, b) => b.count - a.count);

    const signups = new Set(events.filter((e) => e.name === "user_signed_up" && e.user_id).map((e) => e.user_id!));
    const learners = new Set(events.filter((e) => e.user_id && ["learning_session_started", "lesson_generated", "lesson_completed", "exam_started", "math_check_used"].includes(e.name)).map((e) => e.user_id!));
    const examStarters = new Set(events.filter((e) => e.name === "exam_started" && e.user_id).map((e) => e.user_id!));
    const examCompleters = new Set(events.filter((e) => e.name === "exam_completed" && e.user_id).map((e) => e.user_id!));
    return { dau, wau, mau, newUsers, returningUsers, featureUsage, funnel: [{ label: "Signed up", value: signups.size }, { label: "Used learning feature", value: learners.size }, { label: "Started exam", value: examStarters.size }, { label: "Completed exam", value: examCompleters.size }] };
  }, [events]);

  const activity = useMemo(() => {
    const result: { day: string; users: number; events: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY).toISOString());
      const rows = events.filter((e) => dayKey(e.created_at) === key);
      result.push({ day: key.slice(5), users: new Set(rows.map((e) => e.user_id).filter(Boolean)).size, events: rows.length });
    }
    return result;
  }, [events]);

  if (loading) return <main className="p-6"><p className="text-sm text-[var(--muted-foreground)]">Loading product analytics…</p></main>;
  if (error) return <main className="p-6"><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6"><h1 className="text-xl font-bold">Product analytics unavailable</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{error}</p><button onClick={() => void load()} className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">Retry</button></div></main>;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 pb-12">
      <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Shadecode Product Intelligence</p><h1 className="mt-1 text-3xl font-black tracking-tight">Analytics</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Real usage from the last 90 days. No synthetic numbers.</p></header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['DAU', metrics.dau, 'today'], ['WAU', metrics.wau, '7 days'], ['MAU', metrics.mau, '30 days'], ['New users', metrics.newUsers, '30 days'], ['Returning', metrics.returningUsers, '30 days']].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{note}</p></div>)}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"><h2 className="text-lg font-bold">Core funnel</h2><div className="mt-4 space-y-3">{metrics.funnel.map((step, index) => <div key={step.label}><div className="mb-1 flex justify-between text-sm"><span>{index + 1}. {step.label}</span><strong>{step.value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${metrics.funnel[0].value ? Math.max(2, (step.value / metrics.funnel[0].value) * 100) : 0}%` }} /></div></div>)}</div></section>
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"><h2 className="text-lg font-bold">Feature usage</h2><div className="mt-4 space-y-2">{metrics.featureUsage.map((feature) => <div key={feature.name} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><span className="text-sm">{feature.name.replaceAll('_', ' ')}</span><strong className="text-sm">{feature.count}</strong></div>)}</div></section>
      </div>
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-bold">30-day activity</h2><p className="text-xs text-[var(--muted-foreground)]">Unique authenticated users and recorded events.</p></div><button onClick={() => void load()} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-bold">Refresh</button></div><div className="mt-5 flex h-48 items-end gap-1">{activity.map((item) => <div key={item.day} title={`${item.day}: ${item.users} users, ${item.events} events`} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-[var(--primary)]/70 transition-all group-hover:bg-[var(--primary)]" style={{ height: `${Math.max(3, (item.users / Math.max(...activity.map((a) => a.users), 1)) * 100)}%` }} /></div>)}</div><div className="mt-2 flex justify-between text-[10px] text-[var(--muted-foreground)]"><span>{activity[0]?.day}</span><span>{activity.at(-1)?.day}</span></div></section>
    </main>
  );
}
