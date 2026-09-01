"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearQueuedCortexEvents,
  getQueuedCortexEvents,
  subscribeToCortexEvents,
} from "@/lib/cortex/events/queue";
import {
  buildCortexFingerprint,
  resolveCortexExtension,
} from "@/lib/cortex/runtime/engine";
import {
  createCortexCacheKey,
  getCachedCortexInsight,
  setCachedCortexInsight,
} from "@/lib/cortex/runtime/cache";
import { CortexEvent, CortexSnapshot } from "@/lib/cortex/types";
import { getLocalStudyState } from "@/lib/local-first/study-state";
import { getLocalStudyPlan } from "@/lib/local-first/study-plan";
import { listLocalCortexInsights } from "@/lib/local-first/cortex-insights";
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

  const finishProcessing = useEffectEvent(() => { setTimeout(() => setProcessing(false), 300); });

  const addInsightToState = useEffectEvent((saved: Insight) => {
    setInsights((previous) => {
      const nextInsight = { ...saved, isNew: true };
      const nextList = [nextInsight, ...previous].slice(0, 4);
      window.setTimeout(() => setInsights((current) => current.map((insight) => insight.id === saved.id ? { ...insight, isNew: false } : insight)), 600);
      return nextList;
    });
  });

  const loadSnapshot = useEffectEvent(async (): Promise<CortexSnapshot | null> => {
    const localState = await getLocalStudyState(userId).catch(() => null);
    const localPlan = await getLocalStudyPlan(userId).catch(() => null);

    const localTasks = await (async () => {
      try {
        const records = await import("@/lib/local-first/store").then(({ localFirstStore }) => localFirstStore.list(userId));
        return records.filter((record) => record.entity === "task" && !record.deletedAt).map((record) => record.payload as TaskRecord).slice(0, 20);
      } catch { return []; }
    })();
    const localSubjects = await (async () => {
      try {
        const records = await import("@/lib/local-first/store").then(({ localFirstStore }) => localFirstStore.list(userId));
        return records.filter((record) => record.entity === "subject" && !record.deletedAt).map((record) => record.payload as SubjectRecord);
      } catch { return []; }
    })();

    if (localTasks.length || localSubjects.length || localState || localPlan) {
      const completedTasks = localTasks.filter((task) => task.completed);
      return {
        streak: 0,
        level: 1,
        xp: 0,
        totalTasks: localTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: localTasks.length - completedTasks.length,
        subjects: localSubjects.map((subject) => subject.name),
        recentTaskTitles: localTasks.slice(0, 5).map((task) => task.title),
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
    const typedSubjects = (subjects ?? []) as SubjectRecord[];
    const completedTasks = typedTasks.filter((task) => task.completed);
    return {
      streak: Number(profile.streak ?? 0), level: Number(profile.level ?? 1), xp: Number(profile.xp ?? 0),
      totalTasks: typedTasks.length, completedTasks: completedTasks.length, pendingTasks: typedTasks.length - completedTasks.length,
      subjects: typedSubjects.map((subject) => subject.name), recentTaskTitles: typedTasks.slice(0, 5).map((task) => task.title),
    };
  });

  const persistInsight = useEffectEvent(async (insight: string, fingerprint: string, processedEvents: CortexEvent[]) => {
    const cacheKey = createCortexCacheKey(userId, fingerprint);
    if (insights[0]?.insight === insight) {
      setCachedCortexInsight(cacheKey, insight);
      clearQueuedCortexEvents(userId, processedEvents.map((event) => event.id));
      return true;
    }
    const { data: saved, error } = await supabase.from("cortex_insights").insert({ user_id: userId, insight }).select().single();
    if (error || !saved) { console.error("Cortex insight save error:", error); return false; }
    setCachedCortexInsight(cacheKey, insight);
    clearQueuedCortexEvents(userId, processedEvents.map((event) => event.id));
    addInsightToState(saved as Insight);
    return true;
  });

  const runAnalysis = useEffectEvent(async () => {
    if (!userId || processing) return;
    setProcessing(true);
    const queuedEvents = getQueuedCortexEvents(userId);
    try {
      const snapshot = await loadSnapshot();
      if (!snapshot) { finishProcessing(); return; }
      const fingerprint = buildCortexFingerprint(snapshot, queuedEvents);
      const cacheKey = createCortexCacheKey(userId, fingerprint);
      const cachedInsight = getCachedCortexInsight(cacheKey);
      if (cachedInsight) { clearQueuedCortexEvents(userId, queuedEvents.map((event) => event.id)); return; }
      const extensionInsight = resolveCortexExtension({ events: queuedEvents, snapshot });
      if (extensionInsight) { await persistInsight(extensionInsight, fingerprint, queuedEvents); return; }
      const response = await fetch("/api/cortex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestType: "behavior.insight", payload: { snapshot, events: queuedEvents } }) });
      if (!response.ok) throw new Error("Cortex analysis failed");
      const body = await response.json();
      if (body.insight) await persistInsight(body.insight, fingerprint, queuedEvents);
    } catch (error) { console.error("Cortex analysis error:", error); }
    finally { finishProcessing(); }
  });

  useEffect(() => { void runAnalysis(); }, [trigger, userId]);
  useEffect(() => () => { if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current); }, []);

  return null;
}
