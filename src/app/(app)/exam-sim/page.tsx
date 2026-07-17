"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { log } from "@/lib/observability";
import ExamShareCard from "@/components/ExamShareCard";
import {
  CheckCircle2, XCircle, AlertCircle, Trophy,
  Clock, RotateCcw, ChevronDown, ChevronUp, Flame,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = [
  "Mathematics","Physics","Chemistry","Biology","Geography",
  "History","Economics","Computer Science","English Language",
  "English Literature","Accounting","Business Studies","Sociology","Psychology",
];

const DIFFICULTIES = [
  { label: "Ordinary",  value: "O-Level standard",                             color: "#22c55e" },
  { label: "Advanced",  value: "A-Level standard",                             color: "#f59e0b" },
  { label: "Challenge", value: "beyond A-Level, university entrance standard", color: "#ef4444" },
];

// The API's difficulty field is a strict easy|medium|hard enum (used for
// AI cost tuning and marking logic) -- it's separate from the curriculum-
// specific label above, which stays in the prompt via `topic` context.
const DIFFICULTY_API_VALUES = ["easy", "medium", "hard"] as const;

const DIFFICULTY_DISPLAY = ["O-Level", "A-Level", "University"] as const;

const QUESTION_COUNTS = [5, 10, 15, 20];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  type: "multiple_choice" | "short_answer" | "structured";
  question: string;
  options?: string[];
  marks: number;
  topic: string;
}

interface Answer {
  questionId: number;
  answer: string;
  timeSpent: number;
}

interface Result {
  questionId: number;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
  modelAnswer: string;
  topic: string;
}

interface ExamResults {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  cortexInsight: string;
  results: Result[];
  timeTaken: number;
}

interface ChallengeContext {
  id:         string;
  name:       string;
  percentage: number;
  grade:      string;
}

type Step = "setup" | "exam" | "marking" | "results";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderMath(text: string) {
  if (!text) return text;
  try {
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: true,  throwOnError: false }); }
        catch { return expr; }
      })
      .replace(/\$([^$]+)\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
        catch { return expr; }
      });
  } catch { return text; }
}

function getGrade(p: number) {
  if (p >= 90) return "A*"; if (p >= 80) return "A"; if (p >= 70) return "B";
  if (p >= 60) return "C";  if (p >= 50) return "D"; if (p >= 40) return "E";
  return "U";
}

function gradeColor(p: number) {
  if (p >= 80) return "#34d399"; if (p >= 60) return "#60a5fa";
  if (p >= 40) return "#f59e0b"; return "#f87171";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function calculateXP(percentage: number, diffIndex: number): number {
  const multiplier = diffIndex === 2 ? 2 : diffIndex === 1 ? 1.5 : 1;
  return Math.round((percentage / 100) * 100 * multiplier);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamSimulation() {
  const router = useRouter();

  const intervalRef     = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  const userIdRef        = useRef<string>("");
  const answersRef       = useRef<Answer[]>([]);
  const questionsRef     = useRef<Question[]>([]);
  const currentAnswerRef = useRef<string>("");
  const timeLeftRef      = useRef<number>(0);
  const totalTimeRef     = useRef<number>(0);
  const subjectRef       = useRef<string>("");
  const topicRef         = useRef<string>("");
  const difficultyRef    = useRef<number>(0);
  const currentQRef      = useRef<number>(0);

  const [step,          setStep]            = useState<Step>("setup");
  const [subject,       setSubjectState]    = useState("");
  const [topic,         setTopicState]      = useState("");
  const [difficulty,    setDifficultyState] = useState(0);
  const [questionCount, setQuestionCount]   = useState(10);
  const [questions,     setQuestionsState]  = useState<Question[]>([]);
  const [answers,       setAnswersState]    = useState<Answer[]>([]);
  const [currentQState, _setCurrentQState]  = useState(0);
  const [currentAnswer, setCurrentAnswerState] = useState("");
  const [timeLeft,      setTimeLeftState]   = useState(0);
  const [totalTime,     setTotalTimeState]  = useState(0);
  const [qStartTime,    setQStartTime]      = useState(Date.now());
  const [generating,    setGenerating]      = useState(false);
  const [genError,      setGenError]        = useState<string | null>(null);
  const [marking,       setMarking]         = useState(false);
  const [results,       setResults]         = useState<ExamResults | null>(null);
  const [userId,        setUserIdState]     = useState("");
  const [expandedQ,     setExpandedQ]       = useState<number | null>(null);
  const [activeTab,     setActiveTab]       = useState<"overview" | "review">("overview");
  const [resultId,      setResultId]        = useState<string | null>(null);
  const [challengeCtx,  setChallengeCtx]    = useState<ChallengeContext | null>(null);

  // ── Synced setters ─────────────────────────────────────────────────────
  const setSubject = (v: string) => { subjectRef.current = v; setSubjectState(v); };
  const setTopic   = (v: string) => { topicRef.current   = v; setTopicState(v); };
  const setDifficulty = (v: number) => { difficultyRef.current = v; setDifficultyState(v); };
  const setUserId  = (v: string) => { userIdRef.current  = v; setUserIdState(v); };
  const setCurrentQ = (v: number) => { currentQRef.current = v; _setCurrentQState(v); };
  const setAnswers = (fn: (prev: Answer[]) => Answer[]) => {
    setAnswersState(prev => { const next = fn(prev); answersRef.current = next; return next; });
  };
  const setQuestions = (v: Question[]) => { questionsRef.current = v; setQuestionsState(v); };
  const setCurrentAnswer = (v: string) => { currentAnswerRef.current = v; setCurrentAnswerState(v); };
  const setTimeLeft = (fn: (prev: number) => number) => {
    setTimeLeftState(prev => { const next = fn(prev); timeLeftRef.current = next; return next; });
  };
  const setTotalTime = (v: number) => { totalTimeRef.current = v; setTotalTimeState(v); };

  const q = questions[currentQState];

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
    })();
  }, []);

  // ── Challenge mode: read URL params on mount ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const cid    = params.get("cid");
    if (!cid) return;

    const sub    = params.get("sub");
    const dif    = params.get("dif");
    const cnt    = params.get("cnt");
    const cpct   = params.get("cpct");
    const cgrade = params.get("cgrade");
    const cname  = params.get("cname") ?? "Your challenger";

    if (sub) setSubject(decodeURIComponent(sub));
    if (cnt) setQuestionCount(Number(cnt));
    if (dif) {
      const decoded = decodeURIComponent(dif);
      const idx = DIFFICULTIES.findIndex(
        d =>
          d.label === decoded ||
          (decoded === "O-Level"    && d.label === "Ordinary") ||
          (decoded === "A-Level"    && d.label === "Advanced") ||
          (decoded === "University" && d.label === "Challenge")
      );
      if (idx >= 0) setDifficulty(idx);
    }

    setChallengeCtx({
      id:         cid,
      name:       decodeURIComponent(cname),
      percentage: Number(cpct ?? 0),
      grade:      cgrade ?? "?",
    });
  }, []);

  // ── saveAnswer ────────────────────────────────────────────────────────
  const saveAnswer = useCallback(() => {
    const currentQuestion = questionsRef.current[currentQRef.current];
    if (!currentQuestion) return;
    const timeSpent = Math.round((Date.now() - qStartTime) / 1000);
    const payload: Answer = {
      questionId: currentQuestion.id,
      answer:     currentAnswerRef.current,
      timeSpent,
    };
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === currentQuestion.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = payload; return u; }
      return [...prev, payload];
    });
  }, [qStartTime]);

  // ── handleSubmitExam ──────────────────────────────────────────────────
  const handleSubmitExam = useCallback(async () => {
    if (isSubmittingRef.current) {
      log.examDuplicateBlocked({ userId: userIdRef.current, subject: subjectRef.current });
      return;
    }
    isSubmittingRef.current = true;

    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    const latestAnswers    = answersRef.current;
    const latestQuestions  = questionsRef.current;
    const latestUserId     = userIdRef.current;
    const latestSubject    = subjectRef.current;
    const latestTopic      = topicRef.current;
    const latestDifficulty = difficultyRef.current;
    const latestTimeLeft   = timeLeftRef.current;
    const latestTotalTime  = totalTimeRef.current;

    setStep("marking");
    setMarking(true);

    let data: ExamResults;
    try {
      const res = await fetch("/api/exam/mark", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject:    latestSubject,
          difficulty: DIFFICULTIES[latestDifficulty].value,
          questions:  latestQuestions,
          answers:    latestAnswers,
          timeTaken:  latestTotalTime - latestTimeLeft,
          userId:     latestUserId,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "(no body)");
        log.examMarkingFailed({ userId: latestUserId, subject: latestSubject, status: res.status, error: errorText.slice(0, 300) });
        throw new Error(`Marking API returned ${res.status}`);
      }

      data = await res.json();
    } catch (err) {
      log.examMarkingFailed({ userId: latestUserId, subject: latestSubject, error: String(err) });
      alert("Failed to mark exam. Please try again.");
      isSubmittingRef.current = false;
      setStep("exam");
      setMarking(false);
      return;
    }

    setResults(data);

    // ── Persist + capture ID for share URL ────────────────────────────
    if (latestUserId) {
      const timeTaken    = latestTotalTime - latestTimeLeft;
      const correctCount = data.results?.filter(r => r.correct).length ?? 0;

      const { data: insertData, error: insertError } = await createClient()
        .from("exam_results")
        .insert({
          user_id:         latestUserId,
          subject:         latestSubject,
          topic:           latestTopic || null,
          difficulty:      DIFFICULTIES[latestDifficulty].label,
          score:           data.percentage,
          total_questions: latestQuestions.length,
          correct_answers: correctCount,
          weak_areas:      data.weakAreas ?? [],
          time_taken:      timeTaken,
        })
        .select("id")
        .single();

      if (insertError) {
        log.examInsertFailed({
          userId:  latestUserId,
          subject: latestSubject,
          code:    insertError.code,
          message: insertError.message,
        });
      } else if (insertData?.id) {
        setResultId(String(insertData.id));
      }

      if (!insertError && (data.weakAreas?.length ?? 0) > 0) {
        import("@/lib/revisionQueue").then(({ upsertWeakAreas }) => {
          upsertWeakAreas(latestUserId, latestSubject, data.weakAreas);
        }).catch(err => {
          log.revisionUpsertFailed({ userId: latestUserId, topic: "(hook)", subject: latestSubject, message: String(err) });
        });
      }
    }

    // ── Save challenge attempt (fire-and-forget) ───────────────────────
    const currentChallenge = challengeCtx;
    if (currentChallenge?.id) {
      fetch("/api/challenge/attempt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id:          currentChallenge.id,
          percentage:            data.percentage,
          total_score:           data.totalScore,
          max_score:             data.maxScore,
          time_taken:            latestTotalTime - latestTimeLeft,
          grade:                 getGrade(data.percentage),
          challenger_percentage: currentChallenge.percentage,
        }),
      }).catch(() => {/* non-fatal */});
    }

    setStep("results");
    setMarking(false);
  }, [challengeCtx]);

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "exam") return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          saveAnswer();
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [step, handleSubmitExam, saveAnswer]);

  const timePercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor  = timePercent > 50 ? "#22c55e" : timePercent > 20 ? "#f59e0b" : "#ef4444";
  const timerPulse  = timePercent <= 20;

  const card:  React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 16 };
  const input: React.CSSProperties = { width: "100%", background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 10, padding: "12px 14px", color: "var(--foreground)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  // ── Navigation ────────────────────────────────────────────────────────
  const goToQuestion = (index: number) => {
    saveAnswer();
    setCurrentQ(index);
    const existing = answersRef.current.find(a => a.questionId === questionsRef.current[index]?.id);
    setCurrentAnswer(existing?.answer || "");
    setQStartTime(Date.now());
  };

  const onSubmitClick = () => { saveAnswer(); handleSubmitExam(); };

  // ── Generate ──────────────────────────────────────────────────────────
  const generateExam = async () => {
    if (!subject) return;
    setGenerating(true);
    isSubmittingRef.current = false;
    try {
      const curriculumLevel = DIFFICULTIES[difficulty].value;
      const topicWithLevel = topic.trim()
        ? `${topic.trim()} (${curriculumLevel})`
        : `${subject} (${curriculumLevel})`;
      const res = await fetch("/api/exam/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic:        topicWithLevel,
          difficulty:   DIFFICULTY_API_VALUES[difficulty],
          questionCount,
          userId:       userId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.questions) throw new Error(data.error || "No questions were generated.");
      setGenError(null);
      setQuestions(data.questions);
      setCurrentQ(0);
      setCurrentAnswer("");
      setAnswers(() => []);
      const t = questionCount * 2 * 60;
      setTimeLeft(() => t);
      setTotalTime(t);
      setQStartTime(Date.now());
      setStep("exam");
    } catch (err) {
      console.error("[exam-sim] generateExam failed:", err);
      setGenError(err instanceof Error ? err.message : "Couldn't generate this exam. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────
  const resetExam = () => {
    isSubmittingRef.current = false;
    setStep("setup");
    setQuestions([]);
    setAnswers(() => []);
    setCurrentQ(0);
    setCurrentAnswer("");
    setResults(null);
    setExpandedQ(null);
    setActiveTab("overview");
    setResultId(null);
    setChallengeCtx(null);
  };

  /* ══════════════════════════════════════════════════════
     SETUP
  ══════════════════════════════════════════════════════ */
  if (step === "setup") return (
    <div style={{ maxWidth: 650, margin: "0 auto", padding: "40px 16px 120px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>Exam Simulation</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Cortex-generated exams with live marking 🧠</p>
      </div>

      {/* Challenge banner */}
      {challengeCtx && (
        <div style={{ borderRadius: 14, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
              🔥 Challenge Mode
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
              Beat <strong style={{ color: "var(--foreground)" }}>{challengeCtx.name}</strong>&apos;s{" "}
              <strong style={{ color: "#fb923c" }}>{challengeCtx.percentage}%</strong>{" "}
              (Grade {challengeCtx.grade})
            </p>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fb923c" }}>
            {challengeCtx.percentage}%
          </div>
        </div>
      )}

      {/* Subject */}
      <div style={card}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Subject</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              style={{ padding: "8px 14px", borderRadius: 999, border: subject === s ? "1px solid var(--primary)" : "1px solid transparent", background: subject === s ? "rgba(99,102,241,0.15)" : "var(--muted)", color: subject === s ? "var(--primary)" : "var(--foreground)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div style={card}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>
          Topic{" "}
          <span style={{ fontWeight: 400, color: "var(--muted-foreground)", fontSize: 13 }}>(optional)</span>
        </p>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Leave blank for mixed topics..." style={input} />
      </div>

      {/* Difficulty */}
      <div style={card}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Difficulty</p>
        <div style={{ display: "flex", gap: 10 }}>
          {DIFFICULTIES.map((d, i) => (
            <button key={d.label} onClick={() => setDifficulty(i)}
              style={{ flex: 1, padding: "14px 10px", borderRadius: 12, border: difficulty === i ? `1px solid ${d.color}` : "1px solid transparent", background: difficulty === i ? `${d.color}20` : "var(--muted)", color: difficulty === i ? d.color : "var(--foreground)", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14 }}>{d.label}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, opacity: 0.7 }}>{DIFFICULTY_DISPLAY[i]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div style={card}>
        <p style={{ fontWeight: 700, marginBottom: 10 }}>Number of Questions</p>
        <div style={{ display: "flex", gap: 10 }}>
          {QUESTION_COUNTS.map(n => (
            <button key={n} onClick={() => setQuestionCount(n)}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: questionCount === n ? "1px solid var(--primary)" : "1px solid transparent", background: questionCount === n ? "rgba(99,102,241,0.15)" : "var(--muted)", color: questionCount === n ? "var(--primary)" : "var(--foreground)", fontWeight: 700, cursor: "pointer" }}>
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "10px 0 0" }}>
          ⏱ Time limit: {questionCount * 2} minutes
        </p>
      </div>

      {genError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{genError}</p>
          <button onClick={generateExam} style={{ flexShrink: 0, background: "transparent", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 8, padding: "6px 12px", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      <button onClick={generateExam} disabled={!subject || generating}
        style={{ background: "var(--primary)", border: "none", borderRadius: 14, padding: "16px", fontWeight: 800, fontSize: 16, color: "white", cursor: "pointer", opacity: !subject || generating ? 0.5 : 1 }}>
        {generating ? "Generating exam…" : challengeCtx ? `Accept Challenge →` : "Start Exam →"}
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     EXAM
  ══════════════════════════════════════════════════════ */
  if (step === "exam" && q) return (
    <div style={{ maxWidth: 700, margin: "0 auto", minHeight: "100vh", position: "relative", paddingBottom: 180 }}>
      <style>{`
        @keyframes timerPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulse-timer { animation: timerPulse 0.8s ease infinite; }
      `}</style>

      {/* Sticky top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--background)", padding: "14px 16px", borderBottom: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
              {subject}
              {challengeCtx && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#fb923c", fontWeight: 600 }}>
                  🔥 vs {challengeCtx.name}
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              Q{currentQState + 1}/{questions.length} · {DIFFICULTIES[difficulty].label}
            </p>
          </div>
          <div className={timerPulse ? "pulse-timer" : ""}
            style={{ display: "flex", alignItems: "center", gap: 6, background: `${timerColor}15`, border: `1px solid ${timerColor}40`, borderRadius: 12, padding: "8px 14px" }}>
            <Clock size={14} color={timerColor} />
            <span style={{ fontWeight: 900, fontSize: 18, color: timerColor, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <div style={{ height: 5, background: "var(--muted)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${timePercent}%`, height: "100%", background: timerColor, transition: "width 1s linear, background 1s" }} />
        </div>
      </div>

      {/* Question content */}
      <div style={{ padding: "20px 16px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {q.type.replace("_", " ")}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>·</span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>
              {q.marks} mark{q.marks !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}
            dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />
        </div>

        {q.type === "multiple_choice" && q.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setCurrentAnswer(opt)}
                style={{ padding: "14px 16px", borderRadius: 12, border: currentAnswer === opt ? "1px solid var(--primary)" : "1px solid var(--card-border)", background: currentAnswer === opt ? "rgba(99,102,241,0.15)" : "var(--card)", cursor: "pointer", textAlign: "left", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${currentAnswer === opt ? "var(--primary)" : "var(--card-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: currentAnswer === opt ? "var(--primary)" : "var(--muted-foreground)", flexShrink: 0 }}>
                  {["A","B","C","D"][i]}
                </div>
                <span dangerouslySetInnerHTML={{ __html: renderMath(opt) }} />
              </button>
            ))}
          </div>
        )}

        {(q.type === "short_answer" || q.type === "structured") && (
          <textarea value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
            rows={q.type === "structured" ? 8 : 4}
            placeholder="Write your answer here..."
            style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
        )}
      </div>

      {/* Fixed bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000, background: "var(--background)", borderTop: "1px solid var(--card-border)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {questions.map((_, i) => {
              const answered = answersRef.current.some(a => a.questionId === questions[i]?.id && a.answer);
              return (
                <button key={i} onClick={() => goToQuestion(i)} disabled={marking}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: marking ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, background: i === currentQState ? "var(--primary)" : answered ? "rgba(34,197,94,0.3)" : "var(--muted)", color: i === currentQState ? "white" : answered ? "#22c55e" : "var(--foreground)", opacity: marking ? 0.5 : 1 }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {currentQState > 0 && (
              <button onClick={() => goToQuestion(currentQState - 1)} disabled={marking}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: "var(--muted)", color: "var(--foreground)", fontWeight: 700, cursor: marking ? "not-allowed" : "pointer", opacity: marking ? 0.5 : 1 }}>
                ← Prev
              </button>
            )}
            {currentQState < questions.length - 1 ? (
              <button onClick={() => goToQuestion(currentQState + 1)} disabled={marking}
                style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontWeight: 800, fontSize: 15, cursor: marking ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(99,102,241,0.35)", opacity: marking ? 0.5 : 1 }}>
                Next →
              </button>
            ) : (
              <button onClick={onSubmitClick} disabled={marking}
                style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: marking ? "var(--muted)" : "#22c55e", color: marking ? "var(--muted-foreground)" : "white", fontWeight: 800, fontSize: 15, cursor: marking ? "not-allowed" : "pointer", boxShadow: marking ? "none" : "0 0 24px rgba(34,197,94,0.35)", transition: "all 0.2s" }}>
                {marking ? "Submitting…" : "Submit Exam ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     MARKING
  ══════════════════════════════════════════════════════ */
  if (step === "marking") return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 20 }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
      <div style={{ fontSize: 56, animation: "spin 2s linear infinite" }}>🧠</div>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px" }}>Cortex is marking…</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, animation: "pulse 1.5s ease infinite" }}>
          Analysing your answers
        </p>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     RESULTS
  ══════════════════════════════════════════════════════ */
  if (step === "results" && results) {
    const pct           = results.percentage;
    const grade         = getGrade(pct);
    const gc            = gradeColor(pct);
    const timeTakenFmt  = formatTime(results.timeTaken);
    const answeredCount = answersRef.current.filter(a => a.answer.trim()).length;

    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 80px" }}>
        <style>{`
          @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pop    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
          .result-tab  { cursor:pointer; padding:9px 20px; border-radius:10px; border:1px solid transparent; font-weight:600; font-size:13px; transition:all .15s; }
          .expand-btn:hover { background: var(--card-border) !important; }
        `}</style>

        {/* Score hero */}
        <div style={{ borderRadius: 22, border: "1px solid var(--card-border)", background: `radial-gradient(ellipse at 70% 0%, ${gc}22 0%, transparent 55%), var(--card)`, padding: "36px 24px", textAlign: "center", marginBottom: 24, animation: "fadeUp .4s ease" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${gc}18`, border: `2px solid ${gc}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", animation: "pop .5s ease .2s both" }}>
            <Trophy size={32} color={gc} />
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            {subject} · {DIFFICULTIES[difficulty].label}
          </p>
          <h1 style={{ fontSize: 56, fontWeight: 900, color: gc, margin: "0 0 4px", lineHeight: 1 }}>{pct}%</h1>
          <p style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", margin: "0 0 24px" }}>Grade {grade}</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { val: `${results.totalScore}/${results.maxScore}`, label: "Score",    color: gc         },
              { val: timeTakenFmt,                                label: "Time",     color: "#60a5fa"  },
              { val: `${answeredCount}/${questions.length}`,      label: "Answered", color: "#a78bfa"  },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 20px", borderRight: i < 2 ? "1px solid var(--card-border)" : "none" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Challenge comparison ──────────────────────────────────────── */}
        {challengeCtx && (() => {
          const userPct  = results.percentage;
          const theirPct = challengeCtx.percentage;
          const won      = userPct > theirPct;
          const tied     = userPct === theirPct;
          const diff     = Math.abs(userPct - theirPct);
          const banner   = won
            ? { emoji: "🏆", text: `You beat ${challengeCtx.name} by ${diff}%!`,       color: "#34d399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.2)"  }
            : tied
            ? { emoji: "🤝", text: `You tied with ${challengeCtx.name}!`,               color: "#60a5fa", bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.2)"  }
            : { emoji: "💪", text: `${challengeCtx.name} won this round — rematch?`,    color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)" };

          return (
            <div style={{ borderRadius: 18, background: banner.bg, border: `1px solid ${banner.border}`, padding: "20px 22px", marginBottom: 20, animation: "fadeUp .4s ease .1s both" }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: banner.color, margin: "0 0 14px", textAlign: "center" }}>
                {banner.emoji} {banner.text}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "center", background: "var(--surface-2)", borderRadius: 12, padding: "14px 10px", border: won ? `1px solid ${banner.color}40` : "1px solid var(--card-border)" }}>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>You</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: gc, margin: 0 }}>{userPct}%</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>Grade {grade}</p>
                </div>
                <div style={{ flex: 1, textAlign: "center", background: "var(--surface-2)", borderRadius: 12, padding: "14px 10px", border: "1px solid var(--card-border)" }}>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{challengeCtx.name}</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: gradeColor(theirPct), margin: 0 }}>{theirPct}%</p>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>Grade {challengeCtx.grade}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Share card ────────────────────────────────────────────────── */}
        {resultId && (
          <div style={{ marginBottom: 24, animation: "fadeUp .5s ease .15s both" }}>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              🔥 Share your result
            </p>
            <ExamShareCard
              result={{
                id:             resultId,
                user_name:      null,
                subject,
                topic:          topic || null,
                difficulty:     DIFFICULTY_DISPLAY[difficulty],
                score:          results.totalScore,
                total:          results.maxScore,
                question_count: questionCount,
                time_taken:     results.timeTaken,
                xp_earned:      calculateXP(pct, difficulty),
                grade,
                created_at:     new Date().toISOString(),
              }}
              shareUrl={`/results/${resultId}`}
            />
          </div>
        )}

        {/* Weak / Strong areas */}
        {(results.weakAreas?.length > 0 || results.strongAreas?.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {results.strongAreas?.length > 0 && (
              <div style={{ borderRadius: 16, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", padding: "16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={13} /> Strong Areas
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.strongAreas.map((a, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>· {a}</p>
                  ))}
                </div>
              </div>
            )}
            {results.weakAreas?.length > 0 && (
              <div style={{ borderRadius: 16, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", padding: "16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> Needs Work
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.weakAreas.map((a, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>· {a}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cortex insight */}
        {results.cortexInsight && (
          <div style={{ borderRadius: 16, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", padding: "16px 18px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              🧠 Cortex Insight
            </p>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.65 }}>{results.cortexInsight}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["overview", "review"] as const).map(tab => (
            <button key={tab} className="result-tab" onClick={() => setActiveTab(tab)}
              style={{ background: activeTab === tab ? "rgba(99,102,241,0.15)" : "var(--surface-2)", borderColor: activeTab === tab ? "rgba(99,102,241,0.4)" : "var(--card-border)", color: activeTab === tab ? "#a78bfa" : "var(--muted-foreground)", cursor: "pointer", padding: "9px 20px", borderRadius: 10, border: "1px solid", fontWeight: 600, fontSize: 13, transition: "all .15s" }}>
              {tab === "overview" ? "Overview" : `Review All (${results.results?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            {results.results && (
              <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
                {Object.entries(
                  results.results.reduce<Record<string, { score: number; max: number }>>((acc, r) => {
                    const t = r.topic || "General";
                    if (!acc[t]) acc[t] = { score: 0, max: 0 };
                    acc[t].score += r.score;
                    acc[t].max   += r.maxScore;
                    return acc;
                  }, {})
                ).map(([topicKey, { score, max }], i, arr) => {
                  const topicPct = max > 0 ? Math.round((score / max) * 100) : 0;
                  const tc = gradeColor(topicPct);
                  return (
                    <div key={topicKey} style={{ padding: "14px 18px", borderBottom: i < arr.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{topicKey}</p>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tc }}>{topicPct}%</span>
                      </div>
                      <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${topicPct}%`, height: "100%", background: tc, borderRadius: 999, transition: "width .6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Review tab */}
        {activeTab === "review" && results.results && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp .3s ease" }}>
            {results.results.map((r, i) => {
              const origQ   = questions.find(q => q.id === r.questionId);
              const userAns = answersRef.current.find(a => a.questionId === r.questionId);
              const isOpen  = expandedQ === i;
              return (
                <div key={r.questionId} style={{ borderRadius: 16, border: `1px solid ${r.correct ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, background: r.correct ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)", overflow: "hidden", animation: `fadeUp .3s ease ${i * 0.05}s both` }}>
                  <button className="expand-btn" onClick={() => setExpandedQ(isOpen ? null : i)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    {r.correct
                      ? <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
                      : <XCircle     size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isOpen ? "normal" : "nowrap" }}>
                        Q{i + 1}. {origQ?.question ?? `Question ${i + 1}`}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                        {r.topic} · {r.score}/{r.maxScore} marks
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, color: "var(--muted-foreground)" }}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Your Answer</p>
                        <p style={{ fontSize: 13, color: r.correct ? "#34d399" : "var(--danger)", margin: 0, lineHeight: 1.5 }}>
                          {userAns?.answer || "No answer given"}
                        </p>
                      </div>
                      {!r.correct && (
                        <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>✓ Model Answer</p>
                          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.6 }}>{r.modelAnswer}</p>
                        </div>
                      )}
                      <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Feedback</p>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.65 }}>{r.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={resetExam}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--card-border)", color: "var(--muted-foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <RotateCcw size={15} /> New Exam
          </button>
          <button
            onClick={() => {
              resetExam();
              setTimeout(() => {
                setSubject(subject);
                setDifficulty(difficulty);
                setQuestionCount(questionCount);
                setTopic(topic);
              }, 0);
            }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            <Flame size={15} /> Retake Same
          </button>
        </div>
      </div>
    );
  }

  return null;
}
