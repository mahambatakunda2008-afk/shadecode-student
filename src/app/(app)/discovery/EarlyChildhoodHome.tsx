"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CloudOff, Heart, Shapes, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";

type Activity = { id: string; subject: string; topic: string; skill: string; title: string; content: { instructions?: string; questions?: unknown[] } | null; offline_ready: boolean; sort_order: number };
type Progress = { activity_id: string; completed: boolean };

const AREA_META: Record<string, { label: string; icon: typeof Sparkles }> = {
  "early-literacy": { label: "Stories & language", icon: BookOpen },
  "early-numeracy": { label: "Numbers & shapes", icon: Shapes },
  discovery: { label: "My world", icon: Sparkles },
  creative: { label: "Create & imagine", icon: Heart },
};

export default function EarlyChildhoodHome() {
  const { profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profile?.id) return;
      if (!navigator.onLine) { setOffline(true); setLoading(false); return; }
      const { data } = await supabase.from("primary_activities").select("id,subject,topic,skill,title,content,offline_ready,sort_order,primary_curriculum_packs!inner(active)").eq("primary_curriculum_packs.active", true).order("sort_order");
      if (cancelled) return;
      const usable = ((data ?? []) as unknown as Activity[]).filter((item) => Array.isArray(item.content?.questions) && item.content!.questions!.length > 0);
      setActivities(usable);
      if (usable.length) {
        const { data: rows } = await supabase.from("primary_activity_progress").select("activity_id,completed").eq("user_id", profile.id).in("activity_id", usable.map((item) => item.id));
        if (!cancelled) setProgress((rows ?? []) as Progress[]);
      }
      setOffline(false);
      setLoading(false);
    }
    void load();
    const online = () => { setOffline(false); void load(); };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    return () => { cancelled = true; window.removeEventListener("online", online); window.removeEventListener("offline", offlineHandler); };
  }, [profile?.id, supabase]);

  const completed = new Set(progress.filter((item) => item.completed).map((item) => item.activity_id));
  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
      const key = AREA_META[activity.subject]?.label ?? "Explore";
      map.set(key, [...(map.get(key) ?? []), activity]);
    }
    return Array.from(map.entries());
  }, [activities]);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8"><div className="h-80 animate-pulse rounded-[30px] bg-[var(--surface-2)]" /></main>;

  return <main className="mx-auto max-w-4xl px-4 py-5 md:px-6 md:py-8">
    <header className="relative overflow-hidden rounded-[30px] border border-[var(--card-border)] bg-[var(--surface)] p-7 shadow-sm md:p-9">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--primary-glow)] blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]"><Sparkles className="h-4 w-4" /> Discovery</span>{offline && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]"><CloudOff className="h-4 w-4" /> Offline</span>}</div>
        <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-[var(--foreground)] md:text-4xl">What shall we discover today?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Small activities. Big questions. Stories, numbers, shapes, people and the world around you.</p>
      </div>
    </header>

    <section className="mt-5 rounded-[24px] border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--primary)]">A gentle start</p>
      <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">Pick one thing to explore</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {grouped.map(([label, items]) => { const item = items.find((candidate) => !completed.has(candidate.id)) ?? items[0]; const Icon = AREA_META[item.subject]?.icon ?? Sparkles; return <Link key={label} href={`/discovery/activity/${item.id}`} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40">
          <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]" /></div>
          <h3 className="mt-4 text-base font-bold text-[var(--foreground)]">{label}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{item.title}</p>
        </Link>; })}
      </div>
    </section>

    {!activities.length && <section className="mt-5 rounded-[24px] border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><Sparkles className="mx-auto mb-3 h-8 w-8 text-[var(--primary)]" /><h2 className="text-lg font-bold text-[var(--foreground)]">Your discovery pack is getting ready.</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">No ready activities are available yet. Once a curriculum pack is loaded, they will appear here.</p></section>}
  </main>;
}
