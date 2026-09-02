"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Compass, RotateCcw, Sparkles, Star, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getRememberedUserId } from "@/lib/local-first/identity";
import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";
import { createInitialLearningState, updateLearningState, type TopicLearningState } from "@/lib/cortex/learningState";

const TOPIC_ID = "primary:number-sense";
const STORAGE_PREFIX = "shadecode:discovery:number-explorer:v2:";

const QUESTIONS = [
  { id: "q1", prompt: "Which number is bigger?", choices: ["4", "7", "2"], answer: "7", hint: "Count the steps from 1. The bigger number is farther along." },
  { id: "q2", prompt: "What is 3 + 2?", choices: ["4", "5", "6"], answer: "5", hint: "Start at 3 and count two more." },
  { id: "q3", prompt: "Which number comes after 8?", choices: ["7", "9", "10"], answer: "9", hint: "Keep counting: 7, 8, ..." },
  { id: "q4", prompt: "What is 10 - 1?", choices: ["8", "9", "11"], answer: "9", hint: "Take one step back from 10." },
  { id: "q5", prompt: "Which group has more?", choices: ["● ● ●", "● ●", "● ● ● ●"], answer: "● ● ● ●", hint: "Count each group carefully." },
] as const;

type SavedState = {
  activityInstanceId: string;
  questionIndex: number;
  correct: number;
  answered: string[];
  mastery: TopicLearningState;
};

function createActivityInstanceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `number-explorer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageKey(userId: string) { return `${STORAGE_PREFIX}${userId}`; }

function loadSaved(userId: string): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (!parsed?.activityInstanceId || !parsed?.mastery || !Array.isArray(parsed.answered)) return null;
    return parsed;
  } catch { return null; }
}

export default function DiscoveryNumberExplorer() {
  const { profile } = useUser();
  const learnerId = useMemo(() => profile?.id ?? getRememberedUserId() ?? "device", [profile?.id]);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [activityInstanceId, setActivityInstanceId] = useState(() => createActivityInstanceId());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);
  const [mastery, setMastery] = useState<TopicLearningState>(() => createInitialLearningState(TOPIC_ID));
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const restored = loadSaved(learnerId);
    setSaved(restored);
    if (!restored) {
      setActivityInstanceId(createActivityInstanceId());
      return;
    }
    setActivityInstanceId(restored.activityInstanceId);
    setQuestionIndex(Math.min(restored.questionIndex, QUESTIONS.length));
    setCorrectCount(restored.correct);
    setAnswered(restored.answered);
    setMastery(restored.mastery);
    setFinished(restored.questionIndex >= QUESTIONS.length);
  }, [learnerId]);

  const question = QUESTIONS[Math.min(questionIndex, QUESTIONS.length - 1)];
  const stars = finished ? correctCount : Math.floor(correctCount / 2);

  function persist(next: SavedState) {
    setSaved(next);
    try { localStorage.setItem(storageKey(learnerId), JSON.stringify(next)); } catch {}
  }

  function choose(choice: string) {
    if (selected || finished) return;
    const isCorrect = choice === question.answer;
    const nextMastery = updateLearningState(mastery, {
      topicId: TOPIC_ID,
      correct: isCorrect,
      evidenceScore: isCorrect ? 100 : 0,
      observedAt: new Date().toISOString(),
    });
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextAnswered = [...answered, question.id];
    setSelected(choice);
    setMastery(nextMastery);
    setCorrectCount(nextCorrect);
    setAnswered(nextAnswered);
    persist({ activityInstanceId, questionIndex, correct: nextCorrect, answered: nextAnswered, mastery: nextMastery });

    void emitLearningEvent({
      source: "discovery",
      sourceEventId: `number-explorer:${activityInstanceId}:${question.id}`,
      type: "question.attempted",
      subjectId: "mathematics",
      topicId: TOPIC_ID,
      entityId: question.id,
      attemptId: activityInstanceId,
      metadata: { correct: isCorrect, percentage: isCorrect ? 100 : 0 },
    });
  }

  function next() {
    if (!selected) return;
    const nextIndex = questionIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      setFinished(true);
      persist({ activityInstanceId, questionIndex: QUESTIONS.length, correct: correctCount, answered, mastery });
      void emitLearningEvent({
        source: "discovery",
        sourceEventId: `number-explorer:${activityInstanceId}:complete`,
        type: "quiz.completed",
        subjectId: "mathematics",
        topicId: TOPIC_ID,
        entityId: activityInstanceId,
        attemptId: activityInstanceId,
        metadata: { percentage: Math.round((correctCount / QUESTIONS.length) * 100), aggregateOnly: true },
      });
      return;
    }
    setQuestionIndex(nextIndex);
    setSelected(null);
    persist({ activityInstanceId, questionIndex: nextIndex, correct: correctCount, answered, mastery });
  }

  function restart() {
    const fresh = createInitialLearningState(TOPIC_ID);
    const nextActivityInstanceId = createActivityInstanceId();
    setActivityInstanceId(nextActivityInstanceId);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswered([]);
    setMastery(fresh);
    setSelected(null);
    setFinished(false);
    persist({ activityInstanceId: nextActivityInstanceId, questionIndex: 0, correct: 0, answered: [], mastery: fresh });
  }

  if (finished) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <section className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
          <div className="relative p-7 text-center md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--primary-glow)] blur-3xl" />
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
              <Compass className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Explorer complete</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">You found the numbers. 🔭</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">You got {correctCount} of {QUESTIONS.length} right. Your learning state was saved on this device.</p>
            <div className="mt-6 flex justify-center gap-1.5" aria-label={`${stars} stars earned`}>
              {Array.from({ length: QUESTIONS.length }, (_, index) => <Star key={index} className={`h-6 w-6 ${index < stars ? "fill-current text-[var(--primary)]" : "text-[var(--muted-foreground)] opacity-25"}`} />)}
            </div>
            <button type="button" onClick={restart} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
              <RotateCcw className="h-4 w-4" /> Explore again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 md:px-6 md:py-8">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]"><Sparkles className="h-3.5 w-3.5" /> Number Explorer</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">Let’s go exploring.</h1>
        </div>
        <div className="rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]">{questionIndex + 1} / {QUESTIONS.length}</div>
      </header>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]" aria-label={`Progress ${questionIndex} of ${QUESTIONS.length}`}>
        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(questionIndex / QUESTIONS.length) * 100}%` }} />
      </div>

      <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
        <div className="mb-6 flex h-20 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-4xl font-black tracking-wider text-[var(--foreground)]" aria-hidden="true">{question.id === "q5" ? "● ● ● ●" : "123"}</div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--foreground)]">{question.prompt}</h2>
        <div className="mt-6 grid gap-3">
          {question.choices.map((choice) => {
            const isSelected = selected === choice;
            const isAnswer = selected && choice === question.answer;
            const isWrong = isSelected && choice !== question.answer;
            return (
              <button key={choice} type="button" onClick={() => choose(choice)} disabled={Boolean(selected)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-5 text-left text-base font-bold transition-transform ${!selected ? "hover:-translate-y-0.5" : ""} ${isAnswer ? "border-[var(--primary)] bg-[var(--primary-glow)]" : isWrong ? "border-red-400/60 bg-red-400/10" : "border-[var(--card-border)] bg-[var(--surface-2)]"}`}>
                <span>{choice}</span>
                {isAnswer ? <Check className="h-5 w-5 text-[var(--primary)]" /> : isWrong ? <X className="h-5 w-5 text-red-500" /> : null}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <p className="text-sm font-bold text-[var(--foreground)]">{selected === question.answer ? "Nice find! ⭐" : "Not quite. Keep exploring."}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{selected === question.answer ? "That answer is correct." : question.hint}</p>
            <button type="button" onClick={next} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white">
              {questionIndex === QUESTIONS.length - 1 ? "Finish" : "Next discovery"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-[11px] text-[var(--muted-foreground)]">Works offline. Your progress stays on this device and can sync when you reconnect.</p>
      {saved && <span className="sr-only">Saved progress restored</span>}
    </main>
  );
}
