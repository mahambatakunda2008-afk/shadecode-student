"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, CloudOff, Compass, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: string;
  subject: string;
  topic: string;
  skill: string;
  title: string;
  content: { instructions?: string; questions?: unknown[] } | null;
  offline_ready: boolean;
  sort_order: number;
};

type Progress = { activity_id: string; progress: number; completed: boolean; attempt_count: number };
type Mastery = {
  subject: string;
  topic: string;
  mastery_score: number | null;
  confidence: number;
  error_rate: number;
  recent_improvement: number;
  uncertainty: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function recommendationScore(activity: Activity, mastery: Mastery | undefined) {
  if (!mastery) return 0;
  const masteryScore = clamp(Number(mastery.mastery_score ?? 0) / 100);
  const confidence = clamp(Number(mastery.confidence));
  const errorRate = clamp(Number(mastery.error_rate));
  const uncertainty = clamp(Number(mastery.uncertainty));
  const improvement = clamp((Number(mastery.recent_improvement) + 1) / 2);

  return (
    (1 - masteryScore) * 0.5 +
    errorRate * 0.2 +
    uncertainty * 0.2 +
    (1 - confidence) * 0.1 +
    (1 - improvement) * 0.05
  ) * 100 + activity.sort_order / 10000;
}

function readHomeCache(userId: string) {
  try {
    const cached = JSON.parse(localStorage.getItem(`shadecode:discovery:home:v3:${userId}`) || "null");
    return cached?.activities ? cached : null;
  } catch {
    return null;
  }
}

function writeHomeCache(userId: string, value: { activities: Activity[]; progress: Progress[]; mastery: Mastery[] }) {
  try {
    localStorage.setItem(`shadecode:discovery:home:v3:${userId}`, JSON.stringify(value));
  } catch {}
}

export default function DiscoveryHome() {
  const { profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const learnerId = profile?.id;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [mastery, setMastery] = useState<Mastery[]>([]);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function syncQueuedProgress() {
      if (!learnerId || !navigator.onLine) return;
      try {
        const current = JSON.parse(localStorage.getItem("shadecode:discovery:progress-queue:v2") || "[]");
        if (!Array.isArray(current) || !current.length) return;
        const ownQueue = current.filter((item) => item?.userId === learnerId);
        if (!ownQueue.length) return;
        const remaining = current.filter((item) => item?.userId !== learnerId);
        const failed: unknown[] = [];
        for (const item of ownQueue) {
          const { error } = await supabase.from("primary_activity_progress").upsert({
            user_id: learnerId,
            activity_id: item.activityId,
            progress: item.progress,
            completed: item.completed,
            attempt_count: item.attempt_count,
            last_completed_at: item.last_completed_at,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,activity_id" });
          if (error) failed.push(item);
        }
        localStorage.setItem("shadecode:discovery:progress-queue:v2", JSON.stringify([...remaining, ...failed].slice(-100)));
      } catch {}
    }

    async function load() {
      if (!learnerId) return;
      const cached = readHomeCache(learnerId);
      if (cached) {
        setActivities(cached.activities);
        setProgress(cached.progress ?? []);
        setMastery(cached.mastery ?? []);
      }
      if (!navigator.onLine) { setOffline(true); setLoading(false); return; }

      await syncQueuedProgress();
      const { data } = await supabase
        .from("primary_activities")
        .select("id,subject,topic,skill,title,content,offline_ready,sort_order,primary_curriculum_packs!inner(active)")
        .eq("primary_curriculum_packs.active", true)
        .order("sort_order");
      if (cancelled) return;
      const usable = ((data ?? []) as unknown as Activity[]).filter((item) => Array.isArray(item.content?.questions) && item.content!.questions!.length > 0);
      if (!usable.length && cached?.activities?.length) {
        setOffline(true);
        setLoading(false);
        return;
      }
      setActivities(usable);
      if (learnerId && usable.length) {
        const topics = Array.from(new Set(usable.map((item) => item.topic)));
        const [{ data: rows }, { data: masteryRows }] = await Promise.all([
          supabase.from("primary_activity_progress").select("activity_id,progress,completed,attempt_count").eq("user_id", learnerId).in("activity_id", usable.map((item) => item.id)),
          supabase.from("topic_mastery").select("subject,topic,mastery_score,confidence,error_rate,recent_improvement,uncertainty").eq("user_id", learnerId).in("topic", topics),
        ]);
        if (!cancelled) {
          const nextProgress = (rows ?? []) as Progress[];
          const nextMastery = (masteryRows ?? []) as Mastery[];
          setProgress(nextProgress);
          setMastery(nextMastery);
          writeHomeCache(learnerId, { activities: usable, progress: nextProgress, mastery: nextMastery });
        }
      } else {
        writeHomeCache(learnerId, { activities: usable, progress: [], mastery: [] });
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
  }, [learnerId, supabase]);

  const progressMap = useMemo(() => new Map(progress.map((item) => [item.activity_id, item])), [progress]);
  const masteryMap = useMemo(() => new Map(mastery.map((item) => [`${item.subject.toLowerCase()}::${item.topic.toLowerCase()}`, item])), [mastery]);
  const completed = activities.filter((item) => progressMap.get(item.id)?.completed).length;
  const next = useMemo(() => {
    const unfinished = activities.filter((item) => !progressMap.get(item.id)?.completed);
    if (!unfinished.length) return activities[0];
    const hasMastery = unfinished.some((item) => masteryMap.has(`${item.subject.toLowerCase()}::${item.topic.toLowerCase()}`));
    if (!hasMastery) return unfinished[0];
    return unfinished.reduce((best, item) => {
      const bestMastery = masteryMap.get(`${best.subject.toLowerCase()}::${best.topic.toLowerCase()}`);
      const itemMastery = masteryMap.get(`${item.subject.toLowerCase()}::${item.topic.toLowerCase()}`);
      return recommendationScore(item, itemMastery) > recommendationScore(best, bestMastery) ? item : best;
    });
  }, [activities, masteryMap, progressMap]);

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8"><div className="h-72 animate-pulse rounded-[30px] bg-[var(--surface-2)]" /></main>;

  const nextMastery = next ? masteryMap.get(`${next.subject.toLowerCase()}::${next.topic.toLowerCase()}`) : undefined;
  const recommendationLabel = nextMastery
    ? Number(nextMastery.mastery_score ?? 0) < 60 ? "A skill to strengthen" : Number(nextMastery.uncertainty) > 0.5 ? "A skill worth exploring" : "Your next step"
    : "Your next step";

  return <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
    <header className="relative overflow-hidden rounded-[30px] border border-[var(--card-border)] bg-[var(--surface)] p-7 shadow-sm md:p-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--primary-glow)] blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]"><Compass className="h-4 w-4" /> Shadecode Discovery</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] md:text-4xl">My Day starts here. 🌱</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Short adventures, real progress, and a next step chosen from your learning evidence.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-[var(--muted-foreground)]"><span>{completed}/{activities.length} complete</span>{offline && <span className="inline-flex items-center gap-1.5"><CloudOff className="h-4 w-4" /> Offline</span>}</div>
      </div>
    </header>

    {next && <section className="mt-6 rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">{recommendationLabel}</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{next.title}</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{next.subject} · {next.skill}</p></div>
        <Link href={`/discovery/activity/${next.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white">Start adventure <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>}

    <section className="mt-6 grid gap-4 md:grid-cols-2">
      {activities.map((item, index) => { const itemProgress = progressMap.get(item.id); const done = Boolean(itemProgress?.completed); return <article key={item.id} className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]">{done ? <CheckCircle2 className="h-5 w-5" /> : index === 0 ? <Sparkles className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}</div><span className="text-[11px] font-semibold text-[var(--muted-foreground)]">{item.offline_ready ? "Works offline" : "Online"}</span></div>
        <h3 className="mt-5 text-lg font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.subject} · {item.topic}</p>
        <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">{item.content?.instructions ?? "A short learning adventure."}</p>
        <Link href={`/discovery/activity/${item.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">{done ? "Explore again" : "Start"} <ArrowRight className="h-4 w-4" /></Link>
      </article>; })}
    </section>
    {!activities.length && <section className="mt-6 rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><Compass className="mx-auto mb-3 h-9 w-9 text-[var(--primary)]" /><h2 className="text-xl font-bold text-[var(--foreground)]">Your first adventures are loading.</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">No curriculum activity with ready content is available yet.</p></section>}
  </main>;
}
