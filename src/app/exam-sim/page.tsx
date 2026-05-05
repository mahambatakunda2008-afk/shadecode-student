"use client";

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Geography", "History", "Economics", "Computer Science",
  "English Language", "English Literature", "Accounting",
  "Business Studies", "Sociology", "Psychology"
];

const DIFFICULTIES = [
  { label: "Ordinary", value: "O-Level standard", color: "#22c55e" },
  { label: "Advanced", value: "A-Level standard", color: "#f59e0b" },
  { label: "Challenge", value: "beyond A-Level, university entrance standard", color: "#ef4444" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

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

type Step = "setup" | "exam" | "marking" | "results";

export default function ExamSimulation() {
  const [step, setStep] = useState<Step>("setup");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [userId, setUserId] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
    };
    init();
  }, [router, supabase]);

  // Timer
  useEffect(() => {
    if (step === "exam" && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, timeLeft]);

  const generateExam = async () => {
    if (!subject) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topic.trim() || null,
          difficulty: DIFFICULTIES[difficulty].value,
          questionCount,
        }),
      });

      const data = await response.json();
      if (!data.questions) throw new Error("No questions generated");

      setQuestions(data.questions);
      setAnswers([]);
      setCurrentQuestion(0);
      setCurrentAnswer("");

      // Time: 2 minutes per question
      const examTime = questionCount * 2 * 60;
      setTimeLeft(examTime);
      setTotalTime(examTime);
      setQuestionStartTime(Date.now());
      setStep("exam");
    } catch (err) {
      console.error("Generation error:", err);
      alert("Failed to generate exam. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const saveAnswer = () => {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const q = questions[currentQuestion];

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === q.id);
      const newAnswer = { questionId: q.id, answer: currentAnswer, timeSpent };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
  };

  const goToQuestion = (index: number) => {
    saveAnswer();
    setCurrentQuestion(index);
    setQuestionStartTime(Date.now());
    const existing = answers.find(a => a.questionId === questions[index]?.id);
    setCurrentAnswer(existing?.answer || "");
  };

  const handleSubmitExam = async () => {
    saveAnswer();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStep("marking");
    setMarking(true);

    const finalAnswers = [...answers];
    const q = questions[currentQuestion];
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const existing = finalAnswers.findIndex(a => a.questionId === q?.id);
    if (existing >= 0) {
      finalAnswers[existing] = { questionId: q.id, answer: currentAnswer, timeSpent };
    } else if (currentAnswer && q) {
      finalAnswers.push({ questionId: q.id, answer: currentAnswer, timeSpent });
    }

    try {
      const response = await fetch("/api/exam/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          difficulty: DIFFICULTIES[difficulty].value,
          questions,
          answers: finalAnswers,
          timeTaken: totalTime - timeLeft,
        }),
      });

      const data = await response.json();
      setResults(data);

      // Save to Supabase
      if (userId) {
        await supabase.from("exam_results").insert({
          user_id: userId,
          subject,
          topic: topic || null,
          difficulty: DIFFICULTIES[difficulty].label,
          score: data.percentage,
          total_questions: questions.length,
          correct_answers: data.results?.filter((r: Result) => r.correct).length || 0,
          weak_areas: data.weakAreas,
          time_taken: totalTime - timeLeft,
          created_at: new Date().toISOString(),
        });

        // Award XP
        const xpEarned = Math.round(data.percentage * 0.5);
        if (xpEarned > 0) {
          const { data: profile } = await supabase.from("profiles").select("xp, level").eq("id", userId).single();
          if (profile) {
            const newXp = (profile.xp || 0) + xpEarned;
            await supabase.from("profiles").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", userId);
          }
        }
      }

      setStep("results");
    } catch (err) {
      console.error("Marking error:", err);
      alert("Marking failed. Please try again.");
      setStep("exam");
    } finally {
      setMarking(false);
    }
  };

  const resetExam = () => {
    setStep("setup");
    setQuestions([]);
    setAnswers([]);
    setResults(null);
    setCurrentQuestion(0);
    setCurrentAnswer("");
    setTopic("");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timePercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const q = questions[currentQuestion];
  const diffColor = DIFFICULTIES[difficulty].color;

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  // ── Setup Screen ──────────────────────────────────────────────────────────
  if (step === "setup") return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px", margin: "0 auto" }}>
      <div>
        <p style={{ color: "var(--primary)", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Shadecode Student</p>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Exam Simulation</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          AI-generated exam questions. Timed. Marked by Cortex.
        </p>
      </div>

      {/* Subject */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>Subject</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
              background: subject === s ? "rgba(99,102,241,0.15)" : "var(--muted)",
              border: subject === s ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
              color: subject === s ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: subject === s ? 700 : 400, transition: "all 0.2s",
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Topic (optional) */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
          Topic <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span>
        </p>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Quadratic equations, Mechanics, Organic chemistry..."
          style={inputStyle}
        />
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          Leave blank for a mixed paper across the full syllabus
        </p>
      </div>

      {/* Difficulty */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>Difficulty</p>
        <div style={{ display: "flex", gap: "8px" }}>
          {DIFFICULTIES.map((d, i) => (
            <button key={d.label} onClick={() => setDifficulty(i)} style={{
              flex: 1, padding: "10px 6px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
              background: difficulty === i ? `${d.color}15` : "var(--muted)",
              border: difficulty === i ? `1px solid ${d.color}60` : "1px solid transparent",
              color: difficulty === i ? d.color : "var(--muted-foreground)",
              fontWeight: difficulty === i ? 700 : 400, transition: "all 0.2s", textAlign: "center",
            }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>Number of Questions</p>
        <div style={{ display: "flex", gap: "8px" }}>
          {QUESTION_COUNTS.map(n => (
            <button key={n} onClick={() => setQuestionCount(n)} style={{
              flex: 1, padding: "10px", borderRadius: "8px", fontSize: "14px", cursor: "pointer",
              background: questionCount === n ? "rgba(99,102,241,0.15)" : "var(--muted)",
              border: questionCount === n ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
              color: questionCount === n ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: questionCount === n ? 700 : 400, transition: "all 0.2s", textAlign: "center",
            }}>
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "6px" }}>
          ⏱ Time allowed: {questionCount * 2} minutes
        </p>
      </div>

      <button
        onClick={generateExam}
        disabled={!subject || generating}
        style={{
          background: !subject || generating ? "var(--muted)" : "var(--primary)",
          color: !subject || generating ? "var(--muted-foreground)" : "white",
          border: "none", borderRadius: "12px", padding: "16px",
          fontWeight: 800, fontSize: "16px", cursor: !subject || generating ? "not-allowed" : "pointer",
          boxShadow: !subject || generating ? "none" : "0 0 20px var(--primary-glow)",
          transition: "all 0.2s",
        }}
      >
        {generating ? "🧠 Generating exam..." : "Start Exam →"}
      </button>
    </div>
  );

  // ── Exam Screen ───────────────────────────────────────────────────────────
  if (step === "exam" && q) return (
    <div style={{ padding: "0", display: "flex", flexDirection: "column", height: "100vh", maxWidth: "600px", margin: "0 auto" }}>

      {/* Timer bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--card)", borderBottom: "1px solid var(--card-border)",
        padding: "12px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>{subject} — {DIFFICULTIES[difficulty].label}</p>
          <p style={{
            fontSize: "18px", fontWeight: 800, fontVariantNumeric: "tabular-nums",
            color: timeLeft < 300 ? "#ef4444" : timeLeft < 600 ? "#f59e0b" : "var(--foreground)",
          }}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "4px" }}>
          <div style={{
            background: timeLeft < 300 ? "#ef4444" : timeLeft < 600 ? "#f59e0b" : "var(--primary)",
            borderRadius: "99px", height: "4px",
            width: `${timePercent}%`, transition: "width 1s linear, background 0.3s ease",
          }} />
        </div>
      </div>

      {/* Question content */}
      <div style={{ padding: "80px 20px 180px", overflowY: "auto", flex: 1 }}>
        {/* Question header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{
              fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
              background: q.type === "multiple_choice" ? "rgba(99,102,241,0.15)" : q.type === "short_answer" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
              color: q.type === "multiple_choice" ? "#6366f1" : q.type === "short_answer" ? "#22c55e" : "#f59e0b",
            }}>
              {q.type === "multiple_choice" ? "MCQ" : q.type === "short_answer" ? "Short Answer" : "Structured"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {currentQuestion + 1} / {questions.length}
          </p>
        </div>

        <p dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.6, marginBottom: "16px" }} />

        {/* MCQ options */}
        {q.type === "multiple_choice" && q.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {q.options.map((option, i) => (
              <button key={i} onClick={() => setCurrentAnswer(option)} style={{
                padding: "12px 16px", borderRadius: "8px", textAlign: "left",
                fontSize: "14px", cursor: "pointer", transition: "all 0.2s",
                background: currentAnswer === option ? "rgba(99,102,241,0.15)" : "var(--muted)",
                border: currentAnswer === option ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                color: currentAnswer === option ? "var(--primary)" : "var(--foreground)",
                fontWeight: currentAnswer === option ? 600 : 400,
              }}>
                <span style={{ marginRight: "10px", opacity: 0.5 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: renderMath(option) }} />
              </button>
            ))}
          </div>
        )}

        {/* Short answer */}
        {q.type === "short_answer" && (
          <textarea
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            placeholder="Write your answer here..."
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        )}

        {/* Structured */}
        {q.type === "structured" && (
          <textarea
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            placeholder="Show all working and reasoning..."
            rows={8}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--card)", borderTop: "1px solid var(--card-border)",
        padding: "12px 20px",
      }}>
        {/* Question dots */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
          {questions.map((_, i) => {
            const answered = answers.some(a => a.questionId === questions[i].id) || (i === currentQuestion && currentAnswer);
            return (
              <button key={i} onClick={() => goToQuestion(i)} style={{
                width: "28px", height: "28px", borderRadius: "6px", fontSize: "11px",
                cursor: "pointer", fontWeight: 600, border: "none",
                background: i === currentQuestion ? "var(--primary)" : answered ? "rgba(34,197,94,0.3)" : "var(--muted)",
                color: i === currentQuestion ? "white" : answered ? "#22c55e" : "var(--muted-foreground)",
              }}>
                {i + 1}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {currentQuestion > 0 && (
            <button onClick={() => goToQuestion(currentQuestion - 1)} style={{
              background: "var(--muted)", border: "none", borderRadius: "8px",
              padding: "10px 16px", fontSize: "14px", cursor: "pointer", color: "var(--foreground)",
            }}>
              ← Prev
            </button>
          )}
          {currentQuestion < questions.length - 1 ? (
            <button onClick={() => goToQuestion(currentQuestion + 1)} style={{
              flex: 1, background: "var(--primary)", border: "none", borderRadius: "8px",
              padding: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "white",
            }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmitExam} style={{
              flex: 1, background: "#22c55e", border: "none", borderRadius: "8px",
              padding: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "white",
              boxShadow: "0 0 16px rgba(34,197,94,0.4)",
            }}>
              Submit Exam ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Marking Screen ────────────────────────────────────────────────────────
  if (step === "marking") return (
    <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
      <div style={{
        width: "80px", height: "80px", borderRadius: "50%",
        background: "rgba(99,102,241,0.1)", border: "2px solid rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
        animation: "spin 2s linear infinite",
      }}>
        🧠
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Cortex is marking...</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.6 }}>
          Analysing your answers, checking working, and identifying patterns.
        </p>
      </div>
    </div>
  );

  // ── Results Screen ────────────────────────────────────────────────────────
  if (step === "results" && results) {
    const gradeColor = results.percentage >= 80 ? "#22c55e" : results.percentage >= 60 ? "#f59e0b" : results.percentage >= 40 ? "#6366f1" : "#ef4444";
    const timeTakenMin = Math.round(results.timeTaken / 60);

    return (
      <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", margin: "0 auto" }}>

        {/* Score card */}
        <div style={{
          background: `${gradeColor}10`, border: `1px solid ${gradeColor}30`,
          borderRadius: "16px", padding: "24px", textAlign: "center",
        }}>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            {subject} — {DIFFICULTIES[difficulty].label}
          </p>
          <p style={{ fontSize: "64px", fontWeight: 800, color: gradeColor, lineHeight: 1 }}>
            {results.percentage}%
          </p>
          <p style={{ fontSize: "24px", fontWeight: 700, color: gradeColor, marginTop: "4px" }}>
            {results.grade}
          </p>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "8px" }}>
            {results.totalScore}/{results.maxScore} marks · {timeTakenMin} min
          </p>
        </div>

        {/* Cortex insight */}
        <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "16px" }}>
          <p style={{ fontSize: "11px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>CORTEX</p>
          <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--muted-foreground)" }}>{results.cortexInsight}</p>
        </div>

        {/* Weak & strong areas */}
        {results.weakAreas.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", marginBottom: "8px" }}>⚠ Needs work</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {results.weakAreas.map(area => (
                <span key={area} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {results.strongAreas.length > 0 && (
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px", padding: "14px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#22c55e", marginBottom: "8px" }}>✓ Strong areas</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {results.strongAreas.map(area => (
                <span key={area} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
          <p style={{ fontWeight: 700, marginBottom: "12px", fontSize: "14px" }}>Question Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {results.results.map((r, i) => (
              <div key={r.questionId} style={{
                borderLeft: `3px solid ${r.correct ? "#22c55e" : r.score > 0 ? "#f59e0b" : "#ef4444"}`,
                paddingLeft: "12px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>Q{i + 1}: {r.topic}</p>
                  <span style={{
                    fontSize: "12px", fontWeight: 700,
                    color: r.correct ? "#22c55e" : r.score > 0 ? "#f59e0b" : "#ef4444",
                  }}>
                    {r.score}/{r.maxScore}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "4px" }}>
                  {r.feedback}
                </p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7 }}>
                  Model answer: {r.modelAnswer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={resetExam} style={{
            flex: 1, background: "var(--primary)", border: "none", borderRadius: "12px",
            padding: "14px", fontWeight: 700, fontSize: "15px", cursor: "pointer", color: "white",
            boxShadow: "0 0 16px var(--primary-glow)",
          }}>
            New Exam
          </button>
          <button onClick={() => router.push("/dashboard")} style={{
            flex: 1, background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: "12px",
            padding: "14px", fontWeight: 600, fontSize: "14px", cursor: "pointer", color: "var(--foreground)",
          }}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }
function renderMath(text: string) {
  if (!text) return text;
  try {
    // Replace block math $$...$$ and inline math $...$
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: true, throwOnError: false });
        } catch { return expr; }
      })
      .replace(/\$([^$]+)\$/g, (_, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: false, throwOnError: false });
        } catch { return expr; }
      });
  } catch { return text; }
}
  return null;
}
