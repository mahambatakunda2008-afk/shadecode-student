"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CloudOff, Compass, RotateCcw, Sparkles, Star, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getRememberedUserId } from "@/lib/local-first/identity";
import { createClient } from "@/lib/supabase/client";
import { emitLearningEvent, primaryActivityCompletedEvent } from "@/lib/intelligence/emitLearningEvent";

type Activity = {
  id: string;
  subject: string;
  topic: string;
  skill: string;
  title: string;
  content: { instructions?: string; kind?: string };
  offline_ready: boolean;
};

type Progress = { progress: number; completed: boolean; attempt_count: number; last_completed_at: string | null };
type SavedState = { activity: Activity; questionIndex: number; correct: number; answered: string[]; offline: boolean };

const CACHE_PREFIX = "shadecode:discovery:activity:v3:";
const QUEUE_KEY = "shadecode:discovery:progress-queue:v2";
const QUESTIONS = [
  { id: "q1", prompt: "In 347, what does the 4 mean?", choices: ["4", "40", "400"], answer: "40", hint: "The 4 is in the tens place." },
  { id: "q2", prompt: "Which number has 6 hundreds?", choices: ["261", "612", "126"], answer: "612", hint: "Look at the hundreds digit." },
  { id: "q3", prompt: "What is the value of 8 in 582?", choices: ["8", "80", "800"], answer: "80", hint: "The 8 is in the tens place." },
  { id: "q4", prompt: "Build 305. Which digit is in the hundreds place?", choices: ["3", "0", "5"], answer: "3", hint: "Hundreds come before tens and ones." },
  { id: "q5", prompt: "Which number is greatest?", choices: ["409", "490", "904"], answer: "904", hint: "Compare the hundreds digits first." },
] as const;

function cacheKey(userId: string) { return `${CACHE_PREFIX}${userId}`; }
function readSaved(userId: string): SavedState | null {
  try { const value = JSON.parse(localStorage.getItem(cacheKey(userId)) || "null"); return value?.activity?.id ? value : null; } catch { return null; }
}
function writeSaved(userId: string, state: SavedState) { try { localStorage.setItem(cacheKey(userId), JSON.stringify(state)); } catch {} }
function queueProgress(userId: string, activityId: string, attemptCount: number) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    const next = Array.isArray(queue) ? queue.filter((item) => !(item?.userId === userId && item?.activityId === activityId)) : [];
    next.push({ userId, activityId, progress: 100, completed: true, attempt_count: attemptCount, last_completed_at: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next.slice(-100)));
  } catch {}
}

export default function DiscoveryNumberExplorer() {
  const { profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const learnerId = useMemo(() => profile?.id ?? getRememberedUserId(), [profile?.id]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!learnerId) return;
    const saved = readSaved(learnerId);
    if (saved) {
      setActivity(saved.activity);
      setQuestionIndex(Math.min(saved.questionIndex, QUESTIONS.length));
      setCorrectCount(saved.correct);
      setAnswered(saved.answered);
      setFinished(saved.questionIndex >= QUESTIONS.length);
      setOffline(saved.offline || !navigator.onLine);
    }

    if (!navigator.onLine) { setLoading(false); return; }
    const { data: row } = await supabase
      .from("primary_activities")
      .select("id,subject,topic,skill,title,content,offline_ready,primary_curriculum_packs!inner(active)")
      .eq("primary_curriculum_packs.active", true)
      .eq("title", "Place Value Explorer")
      .maybeSingle();
    if (row) {
      const nextActivity = { ...row, content: (row.content ?? {}) as Activity["content"] } as Activity;
      setActivity(nextActivity);
      const { data: savedProgress } = await supabase.from("primary_activity_progress").select("progress,completed,attempt_count,last_completed_at").eq("user_id", learnerId).eq("activity_id", nextActivity.id).maybeSingle();
      setProgress((savedProgress as Progress | null) ?? null);
    }
    setOffline(false);
    setLoading(false);
  }, [learnerId, supabase]);

  useEffect(() => {
    void load();
    const online = () => { setOffline(false); void load(); };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offlineHandler); };
  }, [load]);

  const question = QUESTIONS[Math.min(questionIndex, QUESTIONS.length - 1)];
  const stars = finished ? correctCount : Math.floor(correctCount / 2);

  function persistState(state: SavedState) {
    if (!learnerId) return;
    writeSaved(learnerId, state);
  }

  function choose(choice: string) {
    if (selected || finished || !activity) return;
    const isCorrect = choice === question.answer;
    setSelected(choice);
    setCorrectCount((value) => value + (isCorrect ? 1 : 0));
    setAnswered((value) => [...value, question.id]);
    void emitLearningEvent({
      source: "discovery",
      sourceEventId: `primary:${activity.id}:question:${question.id}:${questionIndex}`,
      type: "question.attempted",
      subjectId: activity.subject,
      topicId: activity.topic,
      entityId: question.id,
      metadata: { correct: isCorrect, evidenceScore: isCorrect ? 100 : 0, offline },
    });
  }

  async function next() {
    if (!selected || !activity || !learnerId) return;
    const isCorrect = selected === question.answer;
    const finalCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const finalAnswered = answered.includes(question.id) ? answered : [...answered, question.id];
    const nextIndex = questionIndex + 1;

    if (nextIndex < QUESTIONS.length) {
      setQuestionIndex(nextIndex);
      setSelected(null);
      persistState({ activity, questionIndex: nextIndex, correct: finalCorrectCount, answered: finalAnswered, offline });
      return;
    }

    const attemptCount = (progress?.attempt_count ?? 0) + 1;
    const finishedAt = new Date().toISOString();
    setCorrectCount(finalCorrectCount);
    setAnswered(finalAnswered);
    setFinished(true);
    setQuestionIndex(QUESTIONS.length);
    persistState({ activity, questionIndex: QUESTIONS.length, correct: finalCorrectCount, answered: finalAnswered, offline });
    primaryActivityCompletedEvent(activity.id, activity.subject, activity.topic, activity.skill, {
      evidenceScore: Math.round((finalCorrectCount / QUESTIONS.length) * 100),
      percentage: Math.round((finalCorrectCount / QUESTIONS.length) * 100),
      offline,
    });

    if (navigator.onLine) {
      const { error } = await supabase.from("primary_activity_progress").upsert({
        user_id: learnerId,
        activity_id: activity.id,
        progress: 100,
        completed: true,
        attempt_count: attemptCount,
        last_completed_at: finishedAt,
        updated_at: finishedAt,
      }, { onConflict: "user_id,activity_id" });
      if (!error) { setProgress({ progress: 100, completed: true, attempt_count: attemptCount, last_completed_at: finishedAt }); return; }
    }
    queueProgress(learnerId, activity.id, attemptCount);
  }

  function restart() {
    const initialState: SavedState = { activity: activity!, questionIndex: 0, correct: 0, answered: [], offline };
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswered([]);
    setSelected(null);
    setFinished(false);
    persistState(initialState);
  }

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-8"><div className="h-72 animate-pulse rounded-[28px] bg-[var(--surface-2)]" /></main>;
  if (!activity) return <main className="mx-auto max-w-3xl px-4 py-8"><section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><Compass className="mx-auto mb-4 h-10 w-10" /><h1 className="text-2xl font-bold">Discovery is getting ready.</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">No active Primary activity is available yet.</p></section></main>;

  if (finished) return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <section className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
        <div className="relative p-7 text-center md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--primary-glow)] blur-3xl" />
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]"><Compass className="h-8 w-8" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Adventure complete</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Place value unlocked. 🔭</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">You got {correctCount} of {QUESTIONS.length} right. Your attempt is {offline ? "saved offline and queued to sync" : "saved to your learning record"}.</p>
          <div className="mt-6 flex justify-center gap-1.5" aria-label={`${stars} stars earned`}>{Array.from({ length: QUESTIONS.length }, (_, index) => <Star key={index} className={`h-6 w-6 ${index < stars ? "fill-current text-[var(--primary)]" : "text-[var(--muted-foreground)] opacity-25"}`} />)}</div>
          <button type="button" onClick={restart} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"><RotateCcw className="h-4 w-4" /> Explore again</button>
        </div>
      </section>
    </main>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 md:px-6 md:py-8">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]"><Sparkles className="h-3.5 w-3.5" /> {activity.subject}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">{activity.title}</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">{activity.skill}</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]">{questionIndex + 1} / {QUESTIONS.length}</span>{offline && <CloudOff className="h-4 w-4 text-[var(--muted-foreground)]" aria-label="Offline" />}</div>
      </header>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(questionIndex / QUESTIONS.length) * 100}%` }} /></div>
      <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
        <div className="mb-6 flex h-20 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-4xl font-black tracking-wider text-[var(--foreground)]" aria-hidden="true">347</div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--foreground)]">{question.prompt}</h2>
        <div className="mt-6 grid gap-3">{question.choices.map((choice) => { const isSelected = selected === choice; const isAnswer = Boolean(selected) && choice === question.answer; const isWrong = isSelected && choice !== question.answer; return <button key={choice} type="button" onClick={() => choose(choice)} disabled={Boolean(selected)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-5 text-left text-base font-bold transition-transform ${!selected ? "hover:-translate-y-0.5" : ""} ${isAnswer ? "border-[var(--primary)] bg-[var(--primary-glow)]" : isWrong ? "border-red-400/60 bg-red-400/10" : "border-[var(--card-border)] bg-[var(--surface-2)]"}`}><span>{choice}</span>{isAnswer ? <Check className="h-5 w-5 text-[var(--primary)]" /> : isWrong ? <X className="h-5 w-5 text-red-500" /> : null}</button>; })}</div>
        {selected && <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><p className="text-sm font-bold text-[var(--foreground)]">{selected === question.answer ? "Nice find! ⭐" : "Not quite. Keep exploring."}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{selected === question.answer ? "That answer is correct." : question.hint}</p><button type="button" onClick={() => void next()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white">{questionIndex === QUESTIONS.length - 1 ? "Finish" : "Next discovery"} <ArrowRight className="h-3.5 w-3.5" /></button></div>}
      </section>
      <p className="mt-4 text-center text-[11px] text-[var(--muted-foreground)]">Your progress is saved locally first, then synced to your learning record when you reconnect.</p>
    </main>
  );
}
