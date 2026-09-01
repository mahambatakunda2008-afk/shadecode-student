"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, Clock, AlertCircle, RefreshCw, ArrowLeft, Sparkles, WifiOff } from "lucide-react";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/async/fetchWithTimeout";
import { summarizeMostFrequentPattern } from "@/lib/insights/patternSummary";
import { createClient } from "@/lib/supabase/client";
import { listLocalCortexInsights, saveLocalCortexInsight, type LocalCortexInsight } from "@/lib/local-first/cortex-insights";

interface Insight { id: string; insight: string; created_at: string; }
type GroupedInsights = Record<string, Insight[]>;

function groupByWeek(insights: Insight[]): GroupedInsights {
  const grouped: GroupedInsights = {};
  insights.forEach((insight) => {
    const date = new Date(insight.created_at); const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); start.setHours(0, 0, 0, 0);
    const key = start.toISOString().split("T")[0];
    (grouped[key] ??= []).push(insight);
  });
  return grouped;
}
function formatWeekLabel(key: string): string {
  const date = new Date(key); const now = new Date(); const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
  const last = new Date(start); last.setDate(start.getDate() - 7);
  if (date.toDateString() === start.toDateString()) return "This week";
  if (date.toDateString() === last.toDateString()) return "Last week";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function InsightSkeleton() { return <div className="flex flex-col gap-4">{[1,2,3].map((i) => <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse"><div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-white/[0.06] flex-shrink-0" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-white/[0.06] rounded w-3/4" /><div className="h-3 bg-white/[0.06] rounded w-1/2" /><div className="h-2.5 bg-white/[0.04] rounded w-1/3 mt-2" /></div></div></div>)}</div>; }
function EmptyState() { return <div className="flex flex-col items-center justify-center py-20 px-6 text-center"><div className="w-16 h-16 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center mb-5"><BrainCircuit className="w-7 h-7 text-[#67E8F9]" /></div><h3 className="text-[16px] font-bold text-white/80 mb-2">Cortex is watching</h3><p className="text-[13px] text-white/35 max-w-[280px] leading-relaxed mb-6">Complete focus sessions, submit exams, and finish tasks. Cortex will start surfacing patterns as it learns how you study.</p><Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/25 text-[#67E8F9] text-[13px] font-medium hover:bg-[#22D3EE]/20 transition-colors"><ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard</Link></div>; }
function PatternSummaryBanner({ insights }: { insights: Insight[] }) { const pattern = summarizeMostFrequentPattern(insights); if (!pattern) return null; return <div className="flex items-center gap-3 p-4 rounded-xl mb-6 bg-[#22D3EE]/[0.06] border border-[#22D3EE]/15"><div className="w-8 h-8 rounded-lg bg-[#22D3EE]/15 flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-[#67E8F9]" /></div><p className="text-[12.5px] text-white/60 leading-relaxed"><span className="text-white/85 font-semibold">"{pattern.theme}"</span> is your most frequent theme lately — it came up in {pattern.count} of your last {pattern.totalInsights} insights.</p></div>; }
function InsightCard({ insight }: { insight: Insight }) { return <div className="flex gap-3 p-4 rounded-xl bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.09] transition-colors"><div className="w-8 h-8 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center flex-shrink-0 mt-0.5"><BrainCircuit className="w-3.5 h-3.5 text-[#67E8F9]" /></div><div className="flex-1 min-w-0"><p className="text-[13px] text-white/75 leading-relaxed"><span className="text-[#67E8F9] font-semibold">Cortex: </span>{insight.insight}</p><div className="flex items-center gap-1.5 mt-2"><Clock className="w-3 h-3 text-white/20" /><span className="text-[11px] text-white/25">{formatTime(insight.created_at)}</span></div></div></div>; }

export default function InsightHistoryPage() {
  const [insights, setInsights] = useState<Insight[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [offline, setOffline] = useState(false);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Please sign in to view your insights."); return; }
      const local = await listLocalCortexInsights(user.id, 100).catch(() => []);
      if (local.length) setInsights(local as Insight[]);
      const online = typeof navigator === "undefined" || navigator.onLine; setOffline(!online);
      if (!online) { if (!local.length) setError("You're offline and there are no saved Cortex insights on this device yet."); return; }
      const res = await fetchWithTimeout("/api/cortex/insight", {}, 20000);
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? "Failed to fetch insights"); }
      const remote = (await res.json()) as Insight[];
      setInsights(remote);
      await Promise.all(remote.map((item) => saveLocalCortexInsight(user.id, item as LocalCortexInsight).catch(() => undefined)));
    } catch (err) {
      if (typeof navigator !== "undefined" && !navigator.onLine) { setOffline(true); if (!insights.length) setError("You're offline. Saved insights remain available on this device."); }
      else setError(err instanceof FetchTimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const grouped = groupByWeek(insights); const weekKeys = Object.keys(grouped).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
  return <div className="min-h-screen bg-[var(--background)] text-white"><div className="max-w-2xl mx-auto px-5 py-8"><div className="mb-8"><Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/55 transition-colors mb-5"><ArrowLeft className="w-3.5 h-3.5" />Dashboard</Link><div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/25 flex items-center justify-center flex-shrink-0"><BrainCircuit className="w-4.5 h-4.5 text-[#67E8F9]" /></div><div className="flex-1"><h1 className="text-[20px] font-bold text-white leading-tight">Cortex Insights</h1><p className="text-[12px] text-white/35">Your study patterns, surfaced automatically</p></div>{offline && <WifiOff className="w-4 h-4 text-white/35" aria-label="Offline" />}</div></div>{loading && <InsightSkeleton />}{error && !loading && <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><div className="flex-1 min-w-0"><p className="text-[13px] text-red-400 font-medium">Unable to load insights</p><p className="text-[12px] text-red-400/60 mt-0.5">{error}</p></div><button onClick={() => void load()} className="flex items-center gap-1.5 text-[12px] text-red-400/70 hover:text-red-400 transition-colors"><RefreshCw className="w-3.5 h-3.5" />Retry</button></div>}{!loading && !error && insights.length === 0 && <EmptyState />}{!loading && !error && insights.length > 0 && <PatternSummaryBanner insights={insights} />}{!loading && !error && weekKeys.length > 0 && <div className="flex flex-col gap-8">{weekKeys.map((key) => <div key={key}><div className="flex items-center gap-3 mb-3"><span className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.08em]">{formatWeekLabel(key)}</span><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-[11px] text-white/20">{grouped[key].length} insight{grouped[key].length !== 1 ? "s" : ""}</span></div><div className="flex flex-col gap-2">{grouped[key].map((insight) => <InsightCard key={insight.id} insight={insight} />)}</div></div>)}</div>}</div></div>;
}
