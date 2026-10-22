"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";
import { buildQuizCompletionEvidence } from "@/lib/intelligence/quizEvidence";
import {
  ArrowLeft, CheckCircle2, XCircle, Sparkles,
  ArrowRight, RotateCcw, Trophy, Brain,
} from "lucide-react";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex?: number;
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
  if (pct === 100) return { label: "Perfect! 🎯",       color: "#fbbf24" };
  if (pct >= 80)   return { label: "Excellent! 🔥",     color: "#34d399" };
  if (pct >= 60)   return { label: "Good job 👍",       color: "#60a5fa" };
  if (pct >= 40)   return { label: "Keep going 📚",     color: "#c4dc87" };
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
  const [quizId, setQuizId] = useState<string>("");
  const [verifiedResult, setVerifiedResult] = useState<{ score: number; correctCount: number; questionCount: number; verified: boolean; curriculumTracked: boolean; warning?: string } | null>(null);
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
        if (qd?.questions?.length && typeof qd.quizId === "string") { setQuestions(qd.questions); setQuizId(qd.quizId); setPhase("quiz"); }
        else { setErrMsg("Couldn't generate quiz questions. Please try again."); setPhase("error"); }
      } catch { setErrMsg("Something went wrong. Please try again."); setPhase("error"); }
    })();
  }, [lessonId]);

  function confirm() {
    if (selected === null) return;
    setConfirmed(true);

    const q = questions[current];
    if (!q) return;
    // Answer keys stay server-side during the quiz. Feedback is revealed after submission.
  }

  async function next() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      try {
        const response = await fetch("/api/learn/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ quizId, answers: newAnswers.map(selectedIndex => ({ selectedIndex })) }),
        });
        const result = await response.json();
        if (response.ok && result?.verified === true && Number.isFinite(result.score) && result.score >= 0 && result.score <= 100 && Number.isInteger(result.correctCount) && result.correctCount >= 0 && Number.isInteger(result.questionCount) && result.questionCount === questions.length && result.correctCount <= result.questionCount) {
          if (Array.isArray(result.questions) && result.questions.length === questions.length) setQuestions(result.questions);
          setVerifiedResult({ score: result.score, correctCount: result.correctCount, questionCount: result.questionCount, verified: true, curriculumTracked: result.curriculumTracked === true, warning: typeof result.warning === "string" ? result.warning : undefined });
          const completion = buildQuizCompletionEvidence({
            quizAttemptId: quizAttemptIdRef.current,
            lessonId,
            percentage: result.score,
            questionCount: result.questionCount,
            correctCount: result.correctCount,
          });
          void emitLearningEvent(completion);
        } else {
          setVerifiedResult(null);
          setErrMsg(result?.error ?? "Your answers were recorded locally, but the score could not be verified. Syllabus mastery was not updated.");
        }
      } catch {
        setVerifiedResult(null);
        setErrMsg("The score could not be verified because the connection failed. Syllabus mastery was not updated.");
      }
      setPhase("results");
    }
  }

  async function restart() {
    if (!token) return;
    setPhase("generating");
    try {
      const response = await fetch("/api/learn/quiz", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lessonId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.questions?.length || typeof data.quizId !== "string") throw new Error(data?.error ?? "Could not create a new quiz.");
      quizAttemptIdRef.current = createQuizAttemptId();
      setQuizId(data.quizId); setQuestions(data.questions); setVerifiedResult(null); setErrMsg("");
      setCurrent(0); setSelected(null); setAnswers([]); setConfirmed(false); setPhase("quiz");
    } catch (error) {
      setErrMsg(error instanceof Error ? error.message : "Could not create a new quiz.");
      setPhase("error");
    }
  }

  const q             = questions[current];
  const correctCount  = verifiedResult?.correctCount ?? answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const pct           = verifiedResult?.score ?? (questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0);
  const grade         = gradeInfo(pct);
  const earnedXP      = xpForScore(correctCount, questions.length);

  // ── Loading / Generating ─────────────────────────────────────────────────

  if (phase === "loading" || phase === "generating") return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ position: "relative", width: 56, height: 56 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(113,140,83,0.15)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.9s linear infinite" }} />
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Brain size={18} color="#c4dc87" />
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 600, margin: 0 }}>
          {phase === "generating" ? "Building your quiz…" : "Loading…"}
        </p>
        <p style={{ color: "var(--muted-foreground)", fontSize: 12, margin: "4px 0 0", animation: "pulse 1.5s ease infinite" }}>
          Analysing lesson content
        </p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────

  if (phase === "error") return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "24px" }}>
      <p style={{ color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{errMsg}</p>
      <Link href={`/learn/${lessonId}`} style={{ color: "#c4dc87", fontSize: 13, textDecoration: "none" }}>← Back to lesson</Link>
    </div>
  );

  // ── Results ──────────────────────────────────────────────────────────────

  if (phase === "results") return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}`}</style>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 64px" }}>

        <Link href={`/learn/${lessonId}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Back to lesson
        </Link>

        {verifiedResult ? <p style={{ color: verifiedResult.warning ? "var(--danger)" : verifiedResult.curriculumTracked ? "#34d399" : "var(--muted-foreground)", fontSize: 12, margin: "0 0 14px" }}>{verifiedResult.warning ?? (verifiedResult.curriculumTracked ? "Score verified and syllabus mastery updated." : "Score verified. This lesson is not linked to verified curriculum objectives, so syllabus mastery was not changed.")}</p> : <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 14px" }}>{errMsg || "Score not verified. Syllabus mastery was not updated."}</p>}

        {/* Score hero */}
        <div style={{ borderRadius: 22, border: "1px solid var(--card-border)", background: "radial-gradient(ellipse at 60% 0%, rgba(139,92,246,0.18) 0%, transparent 60%), var(--card)", padding: "36px 24px", textAlign: "center", marginBottom: 24, animation: "fadeUp .4s ease" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: pct >= 80 ? "rgba(251,191,36,0.15)" : "rgba(113,140,83,0.15)", border: `2px solid ${pct >= 80 ? "rgba(251,191,36,0.35)" : "rgba(139,92,246,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", animation: "pop .5s ease .2s both" }}>
            <Trophy size={30} color={pct >= 80 ? "#fbbf24" : "#c4dc87"} />
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{verifiedResult ? "Quiz Complete" : "Answers Submitted"}</p>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: grade.color, margin: "0 0 4px", lineHeight: 1 }}>{verifiedResult ? `${pct}%` : "—"}</h1>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 24px" }}>{verifiedResult ? grade.label : "Awaiting verification"}</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            {[
              { val: verifiedResult ? `${correctCount}/${questions.length}` : "—", label: "Correct", color: "#34d399" },
              { val: verifiedResult ? `+${earnedXP}` : "—", label: "XP Earned", color: "#fbbf24" },
              { val: verifiedResult ? `${questions.length - correctCount}` : "—", label: "Missed", color: "var(--danger)" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {verifiedResult ? (
          <>
        {/* Per-question breakdown */}
        <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
          Question Breakdown
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {questions.map((q, i) => {
            const userAns   = answers[i];
            const isCorrect = userAns === q.correctIndex;
            return (
              <div key={q.id} style={{ borderRadius: 16, border: `1px solid ${isCorrect ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, background: isCorrect ? "rgba(52,211,153,0.05)" : "rgba(248,113,113,0.05)", padding: "16px 18px", animation: `fadeUp .3s ease ${i * 0.07}s both` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  {isCorrect ? <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>Q{i + 1}. {q.question}</p>
                </div>

                <div style={{ paddingLeft: 26, display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 64 }}>Your ans:</span>
                    <span style={{ fontSize: 13, color: isCorrect ? "#34d399" : "var(--danger)", fontWeight: 600 }}>{q.options[userAns] ?? "No answer"}</span>
                  </div>
                  {!isCorrect && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 64 }}>Correct:</span>
                      <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>{q.correctIndex !== undefined ? q.options[q.correctIndex] : "Answer unavailable"}</span>
                    </div>
                  )}
                </div>

                <div style={{ paddingLeft: 26 }}>
                  <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Explanation</p>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.65 }}>{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          </>
        ) : <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: "0 0 24px" }}>Answer review is unavailable because the server could not verify this attempt.</p>}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={restart} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--card-border)", color: "var(--muted-foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <RotateCcw size={16} /> Retake
          </button>
          <Link href={`/learn/${lessonId}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 14, background: "linear-gradient(135deg, #718c53, #536943)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Back to Lesson <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Quiz ─────────────────────────────────────────────────────────────────

  if (!q) return null;
  const isCorrectAnswer = q.correctIndex !== undefined && selected === q.correctIndex;
  const progressPct     = (current / questions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .opt-btn:hover:not(:disabled) { border-color: rgba(139,92,246,0.4) !important; background: rgba(139,92,246,0.08) !important; }
        .confirm-btn:not(:disabled):hover { filter: brightness(1.1); }
      `}</style>

      {/* Sticky progress header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--background)", borderBottom: "1px solid var(--card-border)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Link href={`/learn/${lessonId}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none" }}>
              <ArrowLeft size={14} /> Lesson
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color="#c4dc87" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>{current + 1} / {questions.length}</span>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #718c53, #536943)", borderRadius: 999, transition: "width .4s ease" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 48px" }}>
        <div key={current} style={{ animation: "fadeUp .25s ease" }}>

          {/* Question */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Question {current + 1}</p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.55 }}>{q.question}</h2>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {q.options.map((opt, i) => {
              let bg     = "var(--card-border)";
              let border = "var(--card-border)";
              let color  = "var(--muted-foreground)";

              if (confirmed) {
                if (q.correctIndex !== undefined && i === q.correctIndex) { bg = "rgba(52,211,153,0.12)"; border = "rgba(52,211,153,0.4)"; color = "#34d399"; }
                else if (q.correctIndex !== undefined && i === selected && selected !== q.correctIndex) { bg = "rgba(248,113,113,0.12)"; border = "rgba(248,113,113,0.4)"; color = "var(--danger)"; }
                else if (i === selected) { bg = "rgba(113,140,83,0.15)"; border = "rgba(113,140,83,0.5)"; color = "#c4dc87"; }
              } else if (selected === i) {
                bg = "rgba(113,140,83,0.15)"; border = "rgba(113,140,83,0.5)"; color = "#c4dc87";
              }

              return (
                <button key={i} className="opt-btn" disabled={confirmed} onClick={() => setSelected(i)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: bg, color, cursor: confirmed ? "default" : "pointer", textAlign: "left", transition: "all .15s", animation: `fadeUp .2s ease ${i * 0.05}s both` }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color }}>
                    {["A", "B", "C", "D"][i]}
                  </div>
                  <span style={{ fontSize: 14, lineHeight: 1.5, fontWeight: (selected === i || (confirmed && i === q.correctIndex)) ? 600 : 400 }}>{opt}</span>
                  {confirmed && q.correctIndex !== undefined && i === q.correctIndex && <CheckCircle2 size={16} color="#34d399" style={{ marginLeft: "auto", flexShrink: 0 }} />}
                  {confirmed && q.correctIndex !== undefined && i === selected && selected !== q.correctIndex && <XCircle size={16} color="var(--danger)" style={{ marginLeft: "auto", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Explanation after confirm */}
          {confirmed && (
            <div style={{ borderRadius: 14, padding: "14px 16px", background: q.correctIndex === undefined ? "var(--surface-2)" : isCorrectAnswer ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${q.correctIndex === undefined ? "var(--card-border)" : isCorrectAnswer ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, marginBottom: 20, animation: "fadeUp .2s ease" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: q.correctIndex === undefined ? "var(--muted-foreground)" : isCorrectAnswer ? "#34d399" : "var(--danger)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                {q.correctIndex === undefined ? "Answer saved" : isCorrectAnswer ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.65 }}>
                {q.correctIndex === undefined ? "The correct answer and explanation will appear in your results after the final question." : q.explanation}
              </p>
            </div>
          )}

          {/* Action button */}
          {!confirmed ? (
            <button onClick={confirm} disabled={selected === null} className="confirm-btn"
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: selected !== null ? "linear-gradient(135deg, #718c53, #536943)" : "var(--card-border)", border: "none", color: selected !== null ? "#fff" : "var(--muted-foreground)", fontSize: 14, fontWeight: 700, cursor: selected !== null ? "pointer" : "not-allowed", transition: "all .15s", boxShadow: selected !== null ? "0 0 20px rgba(64,90,50,0.22)" : "none" }}>
              Confirm Answer
            </button>
          ) : (
            <button onClick={next}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: "linear-gradient(135deg, #718c53, #536943)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 0 20px rgba(64,90,50,0.22)" }}>
              {current < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight size={16} />
            </button>
          )}

          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
            {questions.map((_, i) => {
              let bg = "var(--card-border)";
              if (i < answers.length && questions[i]?.correctIndex !== undefined) bg = answers[i] === questions[i].correctIndex ? "#34d399" : "var(--danger)";
              else if (i < answers.length) bg = "var(--muted-foreground)";
              else if (i === current) bg = "#718c53";
              return <div key={i} style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 999, background: bg, transition: "all .3s" }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
