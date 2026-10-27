"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";
import { buildQuizQuestionEvidence, buildQuizCompletionEvidence } from "@/lib/intelligence/quizEvidence";
import {
  ArrowLeft, CheckCircle2, XCircle, Sparkles,
  ArrowRight, RotateCcw, Trophy, Brain,
} from "lucide-react";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type Phase = "loading" | "generating" | "quiz" | "results" | "error";

function xpForScore(correct: number, total: number): number {
  const pct = correct / total;
  if (pct === 1)  return 50;
  if (pct >= 0.8) return 35;
  if (pct >= 0.6) return 20;
  if (pct >= 0.4) return 10;
  return 5;
}

function gradeInfo(pct: number) {
  if (pct === 100) return { label: "Perfect! 🎯",       color: "var(--warning)" };
  if (pct >= 80)   return { label: "Excellent! 🔥",     color: "var(--success)" };
  if (pct >= 60)   return { label: "Good job 👍",       color: "var(--info)" };
  if (pct >= 40)   return { label: "Keep going 📚",     color: "var(--primary)" };
  return               { label: "Review needed 🔁",  color: "var(--danger)" };
}

export default function QuizPage() {
  const router   = useRouter();
  const params   = useParams();
  const lessonId = params?.lessonId as string;
  const quizAttemptIdRef = useRef<string>("");

  const createQuizAttemptId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  if (!quizAttemptIdRef.current) quizAttemptIdRef.current = createQuizAttemptId();

  const [phase,       setPhase]       = useState<Phase>("loading");
  const [questions,   setQuestions]   = useState<QuizQuestion[]>([]);
  const [current,     setCurrent]     = useState(0);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [answers,     setAnswers]     = useState<number[]>([]);
  const [confirmed,   setConfirmed]   = useState(false);
  const [token,       setToken]       = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [errMsg,      setErrMsg]      = useState("");

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);

      // fetch lesson title
      try {
        const r = await fetch(`/api/learn?lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (r.ok) { const d = await r.json(); setLessonTitle(d.lesson?.title ?? ""); }
      } catch {}

      // generate quiz
      setPhase("generating");
      try {
        const qr = await fetch("/api/learn/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ lessonId }),
        });
        const qd = await qr.json();
        if (qd?.questions?.length) { setQuestions(qd.questions); setPhase("quiz"); }
        else { setErrMsg("Couldn't generate quiz questions. Please try again."); setPhase("error"); }
      } catch { setErrMsg("Something went wrong. Please try again."); setPhase("error"); }
    })();
  }, [lessonId]);

  function confirm() {
    if (selected === null) return;
    setConfirmed(true);

    const q = questions[current];
    if (!q) return;
    const result = {
      questionId: q.id,
      correct: selected === q.correctIndex,
      score: selected === q.correctIndex ? 100 : 0,
      maxScore: 100,
      percentage: selected === q.correctIndex ? 100 : 0,
      questionIndex: current,
    };
    const [event] = buildQuizQuestionEvidence(quizAttemptIdRef.current, lessonId, [result]);
    if (event) void emitLearningEvent(event);
  }

  function next() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      const finalCorrectCount = newAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
      const finalPercentage = questions.length > 0 ? Math.round((finalCorrectCount / questions.length) * 100) : 0;
      const completion = buildQuizCompletionEvidence({
        quizAttemptId: quizAttemptIdRef.current,
        lessonId,
        percentage: finalPercentage,
        questionCount: questions.length,
        correctCount: finalCorrectCount,
      });
      void emitLearningEvent(completion);
      setPhase("results");
    }
  }

  function restart() {
    quizAttemptIdRef.current = createQuizAttemptId();
    setCurrent(0); setSelected(null); setAnswers([]); setConfirmed(false); setPhase("quiz");
  }

  const q             = questions[current];
  const correctCount  = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const pct           = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const grade         = gradeInfo(pct);
  const earnedXP      = xpForScore(correctCount, questions.length);

  // ── Shared presentation ───────────────────────────────────────────────────
  // Tokens only (no hard-coded palette) so the quiz matches the rest of the app in both themes.
  const backLink = "inline-flex min-h-11 items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]";
  const eyebrow = "text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]";
  const good = "border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[var(--success-soft)]";
  const bad = "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)]";

  // ── Loading / Generating ─────────────────────────────────────────────────

  if (phase === "loading" || phase === "generating") return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)]">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-[3px] border-[var(--primary-glow)]" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[color:var(--primary)]" />
        <div className="absolute inset-2.5 flex items-center justify-center rounded-full bg-[var(--primary-glow)]">
          <Brain size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[var(--foreground)]">{phase === "generating" ? "Building your quiz…" : "Loading…"}</p>
        <p className="mt-1 animate-pulse text-xs text-[var(--muted-foreground)]">Analysing lesson content</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────

  if (phase === "error") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] p-6">
      <p role="alert" className="text-center text-sm text-[var(--danger)]">{errMsg}</p>
      <Link href={`/learn/${lessonId}`} className="ssc-button ssc-button-secondary">← Back to lesson</Link>
    </div>
  );

  // ── Results ──────────────────────────────────────────────────────────────

  if (phase === "results") return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[680px] px-4 pb-16 pt-6 sm:pt-8">

        <Link href={`/learn/${lessonId}`} className={`${backLink} mb-5`}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to lesson
        </Link>

        {/* Score hero */}
        <div className="relative mb-6 animate-[ssc-page-in_400ms_ease_both] overflow-hidden rounded-[22px] border border-[var(--card-border)] bg-[var(--card)] px-6 py-9 text-center">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,var(--primary-glow),transparent_60%)]" />
          <div className="relative">
            <div className={`mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 ${pct >= 80 ? "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]" : "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--primary-glow)] text-[var(--primary)]"}`}>
              <Trophy size={30} aria-hidden="true" />
            </div>
            <p className={`${eyebrow} mb-1`}>Quiz Complete</p>
            <h1 className="mb-1 text-5xl font-black leading-none sm:text-[52px]" style={{ color: grade.color }}>{pct}%</h1>
            <p className="mb-6 text-lg font-bold">{grade.label}</p>

            <div className="flex justify-center gap-6">
              {[
                { val: `${correctCount}/${questions.length}`, label: "Correct",   color: "var(--success)" },
                { val: `+${earnedXP}`,                        label: "XP Earned", color: "var(--warning)" },
                { val: `${questions.length - correctCount}`,  label: "Missed",    color: "var(--danger)" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-extrabold leading-none" style={{ color: stat.color }}>{stat.val}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <h2 className={`${eyebrow} mb-3`}>Question Breakdown</h2>
        <div className="mb-7 flex flex-col gap-3">
          {questions.map((question, i) => {
            const userAns   = answers[i];
            const isCorrect = userAns === question.correctIndex;
            return (
              <div key={question.id} className={`animate-[ssc-page-in_300ms_ease_both] rounded-2xl border p-4 ${isCorrect ? good : bad}`} style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="mb-3 flex items-start gap-2.5">
                  {isCorrect
                    ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" aria-label="Correct" />
                    : <XCircle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" aria-label="Incorrect" />}
                  <p className="text-sm font-semibold leading-normal">Q{i + 1}. {question.question}</p>
                </div>

                <div className="mb-3 flex flex-col gap-1.5 pl-[26px]">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-16 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">Your ans:</span>
                    <span className={`text-[13px] font-semibold ${isCorrect ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{question.options[userAns] ?? "No answer"}</span>
                  </div>
                  {!isCorrect && (
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-16 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">Correct:</span>
                      <span className="text-[13px] font-semibold text-[var(--success)]">{question.options[question.correctIndex]}</span>
                    </div>
                  )}
                </div>

                <div className="ml-[26px] rounded-[10px] bg-[var(--surface-2)] px-3.5 py-2.5">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Explanation</p>
                  <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">{question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button type="button" onClick={restart} className="ssc-button ssc-button-secondary min-h-12 flex-1 font-semibold">
            <RotateCcw size={16} aria-hidden="true" /> Retake
          </button>
          <Link href={`/learn/${lessonId}`} className="ssc-button min-h-12 flex-1 font-semibold">
            Back to Lesson <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Quiz ─────────────────────────────────────────────────────────────────

  if (!q) return null;
  const isCorrectAnswer = selected === q.correctIndex;
  const progressPct     = (current / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* Sticky progress header */}
      <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--background)] px-4 py-3.5">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-2 flex items-center justify-between">
            <Link href={`/learn/${lessonId}`} className={backLink}>
              <ArrowLeft size={14} aria-hidden="true" /> Lesson
            </Link>
            <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
              <Sparkles size={14} className="text-[var(--primary)]" aria-hidden="true" />
              <span className="text-[13px] font-semibold">{current + 1} / {questions.length}</span>
            </div>
          </div>
          <div role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPct)} className="h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-[400ms]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pb-12 pt-7">
        <div key={current} className="animate-[ssc-page-in_250ms_ease_both]">

          {/* Question */}
          <div className="mb-6">
            <p className={`${eyebrow} mb-2.5`}>Question {current + 1}</p>
            <h1 className="text-lg font-bold leading-relaxed">{q.question}</h1>
          </div>

          {/* Options */}
          <div role="radiogroup" aria-label="Answer options" className="mb-5 flex flex-col gap-2.5">
            {q.options.map((opt, i) => {
              const isRight = confirmed && i === q.correctIndex;
              const isWrong = confirmed && i === selected && selected !== q.correctIndex;
              const tone = isRight
                ? "border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[var(--success-soft)] text-[var(--success)]"
                : isWrong
                  ? "border-[color-mix(in_srgb,var(--danger)_45%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]"
                  : selected === i
                    ? "border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[var(--primary-glow)] text-[var(--primary)]"
                    : "border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--muted-foreground)] enabled:hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] enabled:hover:bg-[var(--primary-glow)]";
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={selected === i}
                  disabled={confirmed}
                  onClick={() => setSelected(i)}
                  className={`flex min-h-[52px] w-full animate-[ssc-page-in_200ms_ease_both] items-center gap-3.5 rounded-[14px] border px-4 py-3.5 text-left transition-colors enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)] ${tone}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span aria-hidden="true" className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-current text-xs font-bold">{["A", "B", "C", "D"][i]}</span>
                  <span className={`text-sm leading-normal ${selected === i || isRight ? "font-semibold" : "font-normal"}`}>{opt}</span>
                  {isRight && <CheckCircle2 size={16} className="ml-auto shrink-0" aria-label="Correct answer" />}
                  {isWrong && <XCircle size={16} className="ml-auto shrink-0" aria-label="Your answer, incorrect" />}
                </button>
              );
            })}
          </div>

          {/* Explanation after confirm */}
          {confirmed && (
            <div role="status" aria-live="polite" className={`mb-5 animate-[ssc-page-in_200ms_ease_both] rounded-[14px] border px-4 py-3.5 ${isCorrectAnswer ? good : bad}`}>
              <p className={`mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${isCorrectAnswer ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {isCorrectAnswer ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{q.explanation}</p>
            </div>
          )}

          {/* Action button */}
          {!confirmed ? (
            <button type="button" onClick={confirm} disabled={selected === null} className="ssc-button min-h-12 w-full font-bold">
              Confirm Answer
            </button>
          ) : (
            <button type="button" onClick={next} className="ssc-button min-h-12 w-full font-bold">
              {current < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}

          {/* Progress dots (decorative: the progressbar above carries the semantics) */}
          <div aria-hidden="true" className="mt-6 flex justify-center gap-1.5">
            {questions.map((_, i) => {
              const dot = i < answers.length
                ? (answers[i] === questions[i].correctIndex ? "bg-[var(--success)]" : "bg-[var(--danger)]")
                : i === current ? "bg-[var(--primary)]" : "bg-[var(--card-border)]";
              return <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-[22px]" : "w-2"} ${dot}`} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
