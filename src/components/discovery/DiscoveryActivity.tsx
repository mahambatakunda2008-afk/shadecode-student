"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CloudOff, Compass, RotateCcw, Sparkles, Star, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";
import { emitLearningEvent, primaryActivityCompletedEvent } from "@/lib/intelligence/emitLearningEvent";

type Question = { id: string; prompt: string; choices: string[]; answer: string; hint?: string };
type Activity = { id: string; subject: string; topic: string; skill: string; title: string; content: { instructions?: string; questions?: Question[] }; offline_ready: boolean };
type Progress = { progress: number; completed: boolean; attempt_count: number; last_completed_at: string | null };

type ActivityCache = { activity: Activity; index: number; correct: number; finished: boolean; attemptId?: string };

const cachePrefix = "shadecode:discovery:activity:v4:";
const queueKey = "shadecode:discovery:progress-queue:v2";

function readCache(userId: string, activityId: string): ActivityCache | null { try { return JSON.parse(localStorage.getItem(`${cachePrefix}${userId}:${activityId}`) || "null"); } catch { return null; } }
function writeCache(userId: string, activityId: string, value: ActivityCache) { try { localStorage.setItem(`${cachePrefix}${userId}:${activityId}`, JSON.stringify(value)); } catch {} }
function queueProgress(userId: string, activityId: string, attemptCount: number) { try { const current = JSON.parse(localStorage.getItem(queueKey) || "[]"); const queue = Array.isArray(current) ? current.filter((x) => !(x?.userId === userId && x?.activityId === activityId)) : []; queue.push({ userId, activityId, progress: 100, completed: true, attempt_count: attemptCount, last_completed_at: new Date().toISOString() }); localStorage.setItem(queueKey, JSON.stringify(queue.slice(-100))); } catch {} }
function newAttemptId() { return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function DiscoveryActivity({ activityId }: { activityId: string }) {
  const { profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const learnerId = profile?.id;
  const [activity, setActivity] = useState<Activity | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!learnerId) return;
    const cached = readCache(learnerId, activityId);
    if (cached?.activity?.id) {
      setActivity(cached.activity);
      setIndex(cached.index ?? 0);
      setCorrect(cached.correct ?? 0);
      setFinished(Boolean(cached.finished));
      setAttemptId(cached.attemptId ?? newAttemptId());
    } else {
      setAttemptId(newAttemptId());
    }
    if (!navigator.onLine) { setOffline(true); setLoading(false); return; }
    const { data } = await supabase.from("primary_activities").select("id,subject,topic,skill,title,content,offline_ready,primary_curriculum_packs!inner(active)").eq("id", activityId).eq("primary_curriculum_packs.active", true).maybeSingle();
    if (data) {
      const next = { ...data, content: (data.content ?? {}) as Activity["content"] } as Activity;
      setActivity(next);
      writeCache(learnerId, activityId, { activity: next, index: cached?.index ?? 0, correct: cached?.correct ?? 0, finished: Boolean(cached?.finished), attemptId: cached?.attemptId ?? newAttemptId() });
      if (!cached?.attemptId) setAttemptId((current) => current || newAttemptId());
      const { data: saved } = await supabase.from("primary_activity_progress").select("progress,completed,attempt_count,last_completed_at").eq("user_id", learnerId).eq("activity_id", activityId).maybeSingle();
      setProgress((saved as Progress | null) ?? null);
    }
    setOffline(false); setLoading(false);
  }, [activityId, learnerId, supabase]);

  useEffect(() => { void load(); const online = () => { setOffline(false); void load(); }; const offlineHandler = () => setOffline(true); window.addEventListener("online", online); window.addEventListener("offline", offlineHandler); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offlineHandler); }; }, [load]);

  const questions = activity?.content.questions ?? [];
  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];

  function save(nextIndex: number, nextCorrect: number, nextFinished: boolean, nextAttemptId = attemptId) { if (learnerId && activity) writeCache(learnerId, activity.id, { activity, index: nextIndex, correct: nextCorrect, finished: nextFinished, attemptId: nextAttemptId }); }
  function choose(choice: string) { if (!question || selected || finished || !activity || !attemptId) return; const isCorrect = choice === question.answer; setSelected(choice); setCorrect((value) => value + (isCorrect ? 1 : 0)); void emitLearningEvent({ source: "discovery", sourceEventId: `primary:${activity.id}:attempt:${attemptId}:question:${question.id}`, type: "question.attempted", subjectId: activity.subject, topicId: activity.topic, entityId: question.id, attemptId, metadata: { correct: isCorrect, evidenceScore: isCorrect ? 100 : 0, offline } }); }
  async function next() {
    if (!question || !selected || !activity || !learnerId || !attemptId) return;
    const nextCorrect = correct;
    const nextIndex = index + 1;
    if (nextIndex < questions.length) { setIndex(nextIndex); setSelected(null); save(nextIndex, nextCorrect, false); return; }
    const attemptCount = (progress?.attempt_count ?? 0) + 1;
    const score = Math.round((nextCorrect / questions.length) * 100);
    const finishedAt = new Date().toISOString();
    setFinished(true); setIndex(questions.length); save(questions.length, nextCorrect, true);
    void primaryActivityCompletedEvent(activity.id, activity.subject, activity.topic, activity.skill, { evidenceScore: score, percentage: score, offline, attemptId });
    if (navigator.onLine) { const { error } = await supabase.from("primary_activity_progress").upsert({ user_id: learnerId, activity_id: activity.id, progress: 100, completed: true, attempt_count: attemptCount, last_completed_at: finishedAt, updated_at: finishedAt }, { onConflict: "user_id,activity_id" }); if (!error) { setProgress({ progress: 100, completed: true, attempt_count: attemptCount, last_completed_at: finishedAt }); return; } }
    queueProgress(learnerId, activity.id, attemptCount);
  }
  function restart() { if (!activity || !learnerId) return; const nextAttemptId = newAttemptId(); setAttemptId(nextAttemptId); setIndex(0); setCorrect(0); setSelected(null); setFinished(false); save(0, 0, false, nextAttemptId); }

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-8"><div className="h-72 animate-pulse rounded-[28px] bg-[var(--surface-2)]" /></main>;
  if (!activity || !questions.length) return <main className="mx-auto max-w-3xl px-4 py-8"><section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><Compass className="mx-auto mb-4 h-10 w-10 text-[var(--primary)]" /><h1 className="text-2xl font-bold">This adventure is not ready yet.</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">The curriculum pack has not supplied activity questions yet.</p></section></main>;
  if (finished) return <main className="mx-auto max-w-3xl px-4 py-8 md:px-6"><section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center shadow-sm md:p-9"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]"><Compass className="h-8 w-8" /></div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Adventure complete</p><h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">{activity.title} unlocked. ⭐</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">You got {correct} of {questions.length} right. Your attempt is {offline ? "saved offline and queued to sync" : "saved to your learning record"}.</p><div className="mt-6 flex justify-center gap-1.5">{Array.from({ length: questions.length }, (_, i) => <Star key={i} className={`h-6 w-6 ${i < correct ? "fill-current text-[var(--primary)]" : "text-[var(--muted-foreground)] opacity-25"}`} />)}</div><button onClick={restart} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> Explore again</button></section></main>;

  return <main className="mx-auto max-w-3xl px-4 py-5 md:px-6 md:py-8"><header className="mb-5 flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]"><Sparkles className="h-3.5 w-3.5" /> {activity.subject}</p><h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{activity.title}</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">{activity.skill}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold">{index + 1} / {questions.length}</span>{offline && <CloudOff className="h-4 w-4 text-[var(--muted-foreground)]" />}</div></header><div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(index / questions.length) * 100}%` }} /></div><section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8"><p className="mb-5 rounded-2xl bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">{activity.content.instructions}</p><h2 className="text-center text-2xl font-bold text-[var(--foreground)]">{question.prompt}</h2><div className="mt-6 grid gap-3">{question.choices.map((choice) => { const isAnswer = Boolean(selected) && choice === question.answer; const isWrong = selected === choice && choice !== question.answer; return <button key={choice} disabled={Boolean(selected)} onClick={() => choose(choice)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-5 text-left text-base font-bold ${isAnswer ? "border-[var(--primary)] bg-[var(--primary-glow)]" : isWrong ? "border-red-400/60 bg-red-400/10" : "border-[var(--card-border)] bg-[var(--surface-2)]"}`}><span>{choice}</span>{isAnswer ? <Check className="h-5 w-5 text-[var(--primary)]" /> : isWrong ? <X className="h-5 w-5 text-red-500" /> : null}</button>; })}</div>{selected && <div className="mt-5 rounded-2xl bg-[var(--surface-2)] p-4"><p className="text-sm font-bold">{selected === question.answer ? "Nice find! ⭐" : "Not quite. Keep exploring."}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{selected === question.answer ? "That answer is correct." : question.hint}</p><button onClick={() => void next()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white">{index === questions.length - 1 ? "Finish" : "Next discovery"} <ArrowRight className="h-3.5 w-3.5" /></button></div>}</section><p className="mt-4 text-center text-[11px] text-[var(--muted-foreground)]">Progress is saved locally first, then synced when you reconnect.</p></main>;
}
