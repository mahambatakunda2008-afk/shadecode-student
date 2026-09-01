"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getQueuedCortexEvents, subscribeToCortexEvents, clearQueuedCortexEvents } from "@/lib/cortex/events/queue";
import { buildCortexFingerprint, resolveCortexExtension } from "@/lib/cortex/runtime/engine";
import { createCortexCacheKey, getCachedCortexInsight, setCachedCortexInsight } from "@/lib/cortex/runtime/cache";
import { CortexEvent, CortexSnapshot } from "@/lib/cortex/types";
import { getXp, getStreak } from "@/lib/local-first/gamification";
import CurriculumProgressCard from '@/components/CurriculumProgressCard';
import LearningJourney from '@/components/LearningJourney';

interface CortexProps { userId: string; trigger: number; }
interface Insight { id: string; insight: string; created_at: string; isNew?: boolean; }
interface TaskRecord { id: string; title: string; completed: boolean; }
interface SubjectRecord { name: string; }

export default function Cortex({ userId, trigger }: CortexProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [processing, setProcessing] = useState(false);
  const [supabase] = useState(() => createClient());
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishProcessing = useEffectEvent(() => setTimeout(() => setProcessing(false), 300));

  const addInsightToState = useEffectEvent((saved: Insight) => {
    setInsights((previous) => {
      const nextInsight = { ...saved, isNew: true };
      window.setTimeout(() => setInsights((current) => current.map((item) => item.id === saved.id ? { ...item, isNew: false } : item)), 600);
      return [nextInsight, ...previous.filter((item) => item.id !== saved.id)].slice(0, 4);
    });
  });

  const loadSnapshot = useEffectEvent(async (): Promise<CortexSnapshot | null> => {
    const local = await import("@/lib/local-first/store").then(({ localFirstStore }) => localFirstStore.list(userId)).catch(() => []);
    const localTasks = local.filter((r) => r.entity === "task" && !r.deletedAt).map((r) => r.payload as TaskRecord).slice(0, 20);
    const localSubjects = local.filter((r) => r.entity === "subject" && !r.deletedAt).map((r) => r.payload as SubjectRecord);
    const localProgress = local.filter((r) => r.entity === "progress" && !r.deletedAt);
    const [localXp, localStreak] = await Promise.all([getXp(userId).catch(() => null), getStreak(userId).catch(() => null)]);
    const hasLocalSnapshot = localTasks.length || localSubjects.length || localProgress.length || localXp || localStreak;
    if (hasLocalSnapshot) {
      const completedTasks = localTasks.filter((task) => task.completed);
      return {
        streak: localStreak?.current ?? 0,
        level: localXp?.level ?? 1,
        xp: localXp?.totalXp ?? 0,
        totalTasks: localTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: localTasks.length - completedTasks.length,
        subjects: localSubjects.map((s) => s.name),
        recentTaskTitles: localTasks.slice(0, 5).map((t) => t.title),
      };
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const [{ data: tasks }, { data: profile }, { data: subjects }] = await Promise.all([
      supabase.from("tasks").select("id, title, completed").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("streak, level, xp").eq("id", userId).single(),
      supabase.from("subjects").select("name").eq("user_id", userId),
    ]);
    if (!tasks || !profile) return null;
    const typedTasks = tasks as TaskRecord[];
    const completedTasks = typedTasks.filter((task) => task.completed);
    return { streak: Number(profile.streak ?? 0), level: Number(profile.level ?? 1), xp: Number(profile.xp ?? 0), totalTasks: typedTasks.length, completedTasks: completedTasks.length, pendingTasks: typedTasks.length - completedTasks.length, subjects: ((subjects ?? []) as SubjectRecord[]).map((s) => s.name), recentTaskTitles: typedTasks.slice(0, 5).map((t) => t.title) };
  });

  const persistInsight = useEffectEvent(async (insight: string, fingerprint: string, processedEvents: CortexEvent[]) => {
    const cacheKey = createCortexCacheKey(userId, fingerprint);
    if (insights[0]?.insight === insight) { setCachedCortexInsight(cacheKey, insight); clearQueuedCortexEvents(userId, processedEvents.map((e) => e.id)); return true; }
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    const { data: saved, error } = await supabase.from("cortex_insights").insert({ user_id: userId, insight }).select().single();
    if (error || !saved) { console.error("Cortex insight save error:", error); return false; }
    setCachedCortexInsight(cacheKey, insight); clearQueuedCortexEvents(userId, processedEvents.map((e) => e.id)); addInsightToState(saved as Insight); return true;
  });

  const runAnalysis = useEffectEvent(async () => {
    if (!userId || processing) return;
    setProcessing(true);
    const queuedEvents = getQueuedCortexEvents(userId);
    try {
      const snapshot = await loadSnapshot();
      if (!snapshot) return;
      const fingerprint = buildCortexFingerprint(snapshot, queuedEvents);
      const cacheKey = createCortexCacheKey(userId, fingerprint);
      const cachedInsight = getCachedCortexInsight(cacheKey);
      if (cachedInsight) { clearQueuedCortexEvents(userId, queuedEvents.map((e) => e.id)); return; }
      const extensionInsight = resolveCortexExtension({ events: queuedEvents, snapshot });
      if (extensionInsight) { await persistInsight(extensionInsight, fingerprint, queuedEvents); return; }
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const response = await fetch("/api/cortex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestType: "behavior.insight", payload: { snapshot, events: queuedEvents } }) });
      if (!response.ok) throw new Error("Cortex analysis failed");
      const body = await response.json();
      if (body.insight) await persistInsight(body.insight, fingerprint, queuedEvents);
    } catch (error) { console.error("Cortex analysis error:", error); }
    finally { finishProcessing(); }
  });

  useEffect(() => { void runAnalysis(); }, [trigger, userId]);
  useEffect(() => { const unsubscribe = subscribeToCortexEvents(userId, () => void runAnalysis()); return unsubscribe; }, [userId]);
  useEffect(() => () => { if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current); }, []);

  return (
    <section className="space-y-4" aria-label="Cortex AI">
      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Cortex AI</h2><p className="text-sm text-muted-foreground">Your learning intelligence layer</p></div>{processing && <span className="text-xs text-muted-foreground">Thinking…</span>}</div>
        {insights.length > 0 ? <div className="mt-4 space-y-2">{insights.map((item) => <article key={item.id} className="rounded-xl bg-muted/50 p-3 text-sm">{item.insight}</article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Keep studying and Cortex will surface useful patterns here.</p>}
      </div>
      <CurriculumProgressCard />
      <LearningJourney />
    </section>
  );
}
