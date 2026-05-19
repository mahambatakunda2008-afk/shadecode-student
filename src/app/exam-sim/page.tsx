"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, AlertCircle, Clock,
  TrendingUp, TrendingDown, RotateCcw, Star, Zap,
} from "lucide-react";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Geography", "History", "Economics", "Computer Science",
  "English Language", "English Literature", "Accounting",
  "Business Studies", "Sociology", "Psychology",
];

const DIFFICULTIES = [
  { label: "Ordinary",  value: "O-Level standard",                          color: "#22c55e" },
  { label: "Advanced",  value: "A-Level standard",                          color: "#f59e0b" },
  { label: "Challenge", value: "beyond A-Level, university entrance standard", color: "#ef4444" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

interface Question {
  id: number; type: "multiple_choice" | "short_answer" | "structured";
  question: string; options?: string[]; marks: number; topic: string;
}
interface Answer { questionId: number; answer: string; timeSpent: number; }
interface Result {
  questionId: number; score: number; maxScore: number;
  correct: boolean; feedback: string; modelAnswer: string; topic: string;
}
interface ExamResults {
  totalScore: number; maxScore: number; percentage: number; grade: string;
  weakAreas: string[]; strongAreas: string[]; cortexInsight: string;
  results: Result[]; timeTaken: number;
}

type Step = "setup" | "exam" | "marking" | "results";

function renderMath(text: string) {
  if (!text) return text;
  try {
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
        catch { return expr; }
      })
      .replace(/\$([^$]+)\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
        catch { return expr; }
      });
  } catch { return text; }
}

function getGrade(p: number) {
  if (p >= 90) return { grade: "A*", color: "#34d399", label: "Outstanding!" };
  if (p >= 80) return { grade: "A",  color: "#6ee7b7", label: "Excellent!" };
  if (p >= 70) return { grade: "B",  color: "#93c5fd", label: "Great work!" };
  if (p >= 60) return { grade: "C",  color: "#fcd34d", label: "Good effort." };
  if (p >= 50) return { grade: "D",  color: "#fdba74", label: "Keep going." };
  if (p >= 40) return { grade: "E",  color: "#fca5a5", label: "Needs work." };
  return              { grade: "U",  color: "#f87171", label: "Review this topic." };
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function ExamSimulation() {
  const router   = useRouter();
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [step,          setStep]          = useState<Step>("setup");
  const [subject,       setSubject]       = useState("");
  const [topic,         setTopic]         = useState("");
  const [difficulty,    setDifficulty]    = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [answers,       setAnswers]       = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer,   setCurrentAnswer]   = useState("");
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [totalTime,     setTotalTime]     = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [generating,    setGenerating]    = useState(false);
  const [results,       setResults]       = useState<ExamResults | null>(null);
  const [userId,        setUserId]        = useState("");
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  const q            = questions[currentQuestion];
  const timePercent  = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const minutes      = Math.floor(timeLeft / 60);
  const seconds      = timeLeft % 60;

  // Timer color logic
  const timerColor =
    timePercent > 50 ? "#6366f1" :
    timePercent > 20 ? "#f59e0b" : "#ef4444";
  const timerPulse = timePercent <= 20;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (step !== "exam") return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); handleSubmitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step]);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "16px",
    padding: "16px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  function saveAnswer() {
    if (!q) return;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const payload: Answer = { questionId: q.id, answer: currentAnswer, timeSpent };
    setAnswers(prev => {
      const exists = prev.findIndex(a => a.questionId === q.id);
      if (exists >= 0) { const u = [...prev]; u[exists] = payload; return u; }
      return [...prev, payload];
    });
  }

  function goToQuestion(index: number) {
    saveAnswer();
    setCurrentQuestion(index);
    const existing = answers.find(a => a.questionId === questions[index]?.id);
    setCurrentAnswer(existing?.answer || "");
    setQuestionStartTime(Date.now());
  }

  async function generateExam() {
    if (!subject) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic: topic.trim() || null, difficulty: DIFFICULTIES[difficulty].value, questionCount }),
      });
      const data = await res.json();
      if (!data.questions) throw new Error("No questions generated");
      setQuestions(data.questions);
      setCurrentQuestion(0); setCurrentAnswer(""); setAnswers([]);
      const examTime = questionCount * 2 * 60;
      setTimeLeft(examTime); setTotalTime(examTime);
      setQuestionStartTime(Date.now());
      setStep("exam");
    } catch { alert("Failed to generate exam. Please try again."); }
    finally { setGenerating(false); }
  }

  async function handleSubmitExam() {
    saveAnswer();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStep("marking");
    try {
      const res = await fetch("/api/exam/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, difficulty: DIFFICULTIES[difficulty].value, questions, answers, timeTaken: totalTime - timeLeft, userId }),
      });
      const data = await res.json();
      setResults(data);
      if (userId) {
        await supabase.from("exam_results").insert({
          user_id: userId, subject, topic: topic || null,
          difficulty: DIFFICULTIES[difficulty].label,
          score: data.percentage, total_questions: questions.length,
          created_at: new Date().toISOString(),
        });
      }
      setStep("results");
    } catch { alert("Failed to mark exam."); setStep("exam"); }
  }

  function resetExam() {
    setStep("setup"); setQuestions([]); setAnswers([]);
    setCurrentQuestion(0); setCurrentAnswer(""); setResults(null);
  }

  function retakeExam() {
    setQuestions([]); setAnswers([]);
    setCurrentQuestion(0); setCurrentAnswer(""); setResults(null);
    generateExam();
  }

  // ── SETUP ────────────────────────────────────────────────────────────────────

  if (step === "setup") return (
    <div style={{ maxWidth: 650, margin: "0 auto", padding: "40px 20px 120px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 6 }}>Exam Simulation</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Cortex-generated exams with live marking 🧠</p>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Subject</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              style={{ padding: "8px 14px", borderRadius: 999, border: subject === s ? "1px solid var(--primary)" : "1px solid transparent", background: subject === s ? "rgba(99,102,241,0.15)" : "var(--muted)", color: subject === s ? "var(--primary)" : "var(--foreground)", cursor: "pointer", fontWeight: 600 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Topic <span style={{ fontWeight: 400, color: "var(--muted-foreground)", fontSize: 12 }}>(optional)</span></p>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Trigonometry, World War II..." style={inputStyle} />
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Difficulty</p>
        <div style={{ display: "flex", gap: 10 }}>
          {DIFFICULTIES.map((d, i) => (
            <button key={d.label} onClick={() => setDifficulty(i)}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: difficulty === i ? `1px solid ${d.color}` : "1px solid transparent", background: difficulty === i ? `${d.color}20` : "var(--muted)", color: difficulty === i ? d.color : "var(--foreground)", fontWeight: 700, cursor: "pointer" }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Questions</p>
        <div style={{ display: "flex", gap: 10 }}>
          {QUESTION_COUNTS.map(n => (
            <button key={n} onClick={() => setQuestionCount(n)}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: questionCount === n ? "1px solid var(--primary)" : "1px solid transparent", background: questionCount === n ? "rgba(99,102,241,0.15)" : "var(--muted)", color: questionCount === n ? "var(--primary)" : "var(--foreground)", fontWeight: 700, cursor: "pointer" }}>
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8 }}>
          Time allowed: {questionCount * 2} minutes
        </p>
      </div>

      <button onClick={generateExam} disabled={!subject || generating}
        style={{ background: "var(--primary)", border: "none", borderRadius: 14, padding: "16px", fontWeight: 800, fontSize: 16, color: "white", cursor: !subject || generating ? "not-allowed" : "pointer", opacity: !subject ? 0.5 : 1 }}>
        {generating ? "Generating exam…" : "Start Exam →"}
      </button>
    </div>
  );

  // ── EXAM ─────────────────────────────────────────────────────────────────────

  if (step === "exam" && q) return (
    <div style={{ maxWidth: 700, margin: "0 auto", minHeight: "100vh", position: "relative", paddingBottom: 180 }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .timer-pulse { animation: pulse 1s ease-in-out infinite; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--background)", padding: "16px", borderBottom: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontWeight: 700, fontSize: 13 }}>{subject} · Q{currentQuestion + 1}/{questions.length}</p>
          <div className={timerPulse ? "timer-pulse" : ""}
            style={{ display: "flex", alignItems: "center", gap: 6, background: `${timerColor}15`, border: `1px solid ${timerColor}40`, borderRadius: 10, padding: "6px 12px" }}>
            <Clock size={14} color={timerColor} />
            <p style={{ fontWeight: 900, fontSize: 18, color: timerColor, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 5, background: "var(--muted)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${timePercent}%`, height: "100%", background: timerColor, transition: "width 1s linear, background 1s ease" }} />
        </div>
      </div>

      {/* QUESTION */}
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Question {currentQuestion + 1} of {questions.length}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}
            dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />
        </div>

        {q.type === "multiple_choice" && q.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setCurrentAnswer(opt)}
                style={{ padding: 14, borderRadius: 12, border: currentAnswer === opt ? "1px solid var(--primary)" : "1px solid var(--card-border)", background: currentAnswer === opt ? "rgba(99,102,241,0.15)" : "var(--card)", cursor: "pointer", textAlign: "left", color: "var(--foreground)", fontWeight: currentAnswer === opt ? 600 : 400 }}>
                <span dangerouslySetInnerHTML={{ __html: renderMath(opt) }} />
              </button>
            ))}
          </div>
        )}

        {(q.type === "short_answer" || q.type === "structured") && (
          <textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
            rows={q.type === "structured" ? 8 : 4} placeholder="Write your answer here…"
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        )}
      </div>

      {/* FIXED NAVIGATION */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000, background: "var(--background)", borderTop: "1px solid var(--card-border)", padding: 16 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {questions.map((_, i) => {
              const answered = answers.some(a => a.questionId === questions[i]?.id && a.answer);
              return (
                <button key={i} onClick={() => goToQuestion(i)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                    background: i === currentQuestion ? "var(--primary)" : answered ? "rgba(34,197,94,0.2)" : "var(--muted)",
                    color: i === currentQuestion ? "white" : answered ? "#22c55e" : "var(--foreground)",
                    outline: answered && i !== currentQuestion ? "1px solid rgba(34,197,94,0.4)" : "none",
                  }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {currentQuestion > 0 && (
              <button onClick={() => goToQuestion(currentQuestion - 1)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "var(--muted)", color: "var(--foreground)", fontWeight: 700, cursor: "pointer", minHeight: 52 }}>
                ← Previous
              </button>
            )}
            {currentQuestion < questions.length - 1 ? (
              <button onClick={() => goToQuestion(currentQuestion + 1)}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer", minHeight: 52, boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmitExam}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "#22c55e", color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer", minHeight: 52, boxShadow: "0 0 24px rgba(34,197,94,0.35)" }}>
                Submit Exam ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── MARKING ──────────────────────────────────────────────────────────────────

  if (step === "marking") return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 20 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 60, animation: "spin 2s linear infinite" }}>🧠</div>
      <h2 style={{ fontSize: 24, fontWeight: 900 }}>Cortex is marking…</h2>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Analysing every answer…</p>
    </div>
  );

  // ── RESULTS ──────────────────────────────────────────────────────────────────

  if (step === "results" && results) {
    const { grade, color, label } = getGrade(results.percentage);
    const answeredCount = answers.filter(a => a.answer).length;
    const avgTime = answeredCount > 0
      ? Math.round(answers.reduce((s, a) => s + a.timeSpent, 0) / answeredCount)
      : 0;

    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 120px", display: "flex", flexDirection: "column", gap: 20 }}>
        <style>{`
          .result-card { transition: border-color .15s; }
          .result-card:hover { border-color: rgba(255,255,255,0.12) !important; }
          .expand-btn:hover { background: rgba(255,255,255,0.06) !important; }
        `}</style>

        {/* ── Hero score card ── */}
        <div style={{ ...cardStyle, textAlign: "center", padding: "32px 24px", background: `linear-gradient(160deg, ${color}12, transparent)`, border: `1px solid ${color}30` }}>
          <div style={{ fontSize: 72, fontWeight: 900, color, lineHeight: 1, marginBottom: 8 }}>{grade}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--foreground)", marginBottom: 4 }}>{results.percentage}%</div>
          <p style={{ fontSize: 16, fontWeight: 600, color, marginBottom: 20 }}>{label}</p>

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
            {[
              { icon: <Star size={14} />, label: "Score", value: `${results.totalScore}/${results.maxScore}` },
              { icon: <Clock size={14} />, label: "Time taken", value: formatTime(results.timeTaken) },
              { icon: <Zap size={14} />, label: "Avg per Q", value: formatTime(avgTime) },
              { icon: <CheckCircle2 size={14} />, label: "Answered", value: `${answeredCount}/${questions.length}` },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", justifyContent: "center", marginBottom: 4 }}>
                  {stat.icon}
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weak & Strong areas ── */}
        {(results.weakAreas.length > 0 || results.strongAreas.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {results.weakAreas.length > 0 && (
              <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <TrendingDown size={14} color="#f87171" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#f87171", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Needs Work</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.weakAreas.map((area, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <XCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--foreground)" }}>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.strongAreas.length > 0 && (
              <div style={{ ...cardStyle, border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <TrendingUp size={14} color="#22c55e" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Strong Areas</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.strongAreas.map((area, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--foreground)" }}>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Cortex insight ── */}
        {results.cortexInsight && (
          <div style={{ ...cardStyle, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 18 }}>🧠</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>Cortex Insight</p>
            </div>
            <p style={{ fontSize: 14, color: "var(--foreground)", margin: 0, lineHeight: 1.65 }}>{results.cortexInsight}</p>
          </div>
        )}

        {/* ── Per-question breakdown ── */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Question Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.results.map((r, i) => {
              const q        = questions.find(q => q.id === r.questionId);
              const userAns  = answers.find(a => a.questionId === r.questionId)?.answer || "(no answer)";
              const isOpen   = expandedResult === i;
              const statusColor = r.correct ? "#22c55e" : r.score > 0 ? "#f59e0b" : "#ef4444";
              const statusBg    = r.correct ? "rgba(34,197,94,0.08)" : r.score > 0 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
              const statusBorder= r.correct ? "rgba(34,197,94,0.25)" : r.score > 0 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)";

              return (
                <div key={i} className="result-card"
                  style={{ borderRadius: 14, border: `1px solid ${statusBorder}`, background: statusBg, overflow: "hidden" }}>
                  {/* Header row */}
                  <button className="expand-btn" onClick={() => setExpandedResult(isOpen ? null : i)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--foreground)" }}>
                    {/* Status icon */}
                    <div style={{ flexShrink: 0 }}>
                      {r.correct
                        ? <CheckCircle2 size={18} color="#22c55e" />
                        : r.score > 0
                          ? <AlertCircle size={18} color="#f59e0b" />
                          : <XCircle size={18} color="#ef4444" />}
                    </div>
                    {/* Question preview */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Q{i + 1}: {q?.question?.slice(0, 80)}{(q?.question?.length ?? 0) > 80 ? "…" : ""}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{r.topic}</p>
                    </div>
                    {/* Score pill */}
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, borderRadius: 999, padding: "2px 10px" }}>
                      {r.score}/{r.maxScore}
                    </span>
                    {/* Expand chevron */}
                    <span style={{ color: "var(--muted-foreground)", fontSize: 12, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${statusBorder}` }}>
                      {/* Full question */}
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: "14px 0 10px", lineHeight: 1.5 }}>{q?.question}</p>

                      {/* Your answer */}
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Your Answer</p>
                        <div style={{ fontSize: 13, color: r.correct ? "#6ee7b7" : "#fca5a5", background: r.correct ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${r.correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                          {userAns}
                        </div>
                      </div>

                      {/* Model answer */}
                      {!r.correct && (
                        <div style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Correct Answer</p>
                          <div style={{ fontSize: 13, color: "#6ee7b7", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                            {r.modelAnswer}
                          </div>
                        </div>
                      )}

                      {/* Feedback / explanation */}
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Explanation</p>
                        <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, lineHeight: 1.65 }}>{r.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={retakeExam}
            style={{ flex: 1, padding: 16, borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--muted)", color: "var(--foreground)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <RotateCcw size={15} /> Retake
          </button>
          <button onClick={resetExam}
            style={{ flex: 2, padding: 16, borderRadius: 14, border: "none", background: "var(--primary)", color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            New Exam →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
