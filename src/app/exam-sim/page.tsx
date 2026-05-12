"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ───────────────────────── CONFIG ───────────────────────── */

const FOOTER_HEIGHT = 150;
const HEADER_HEIGHT = 90;

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Geography", "History", "Economics", "Computer Science",
  "English Language", "English Literature", "Accounting",
  "Business Studies", "Sociology", "Psychology"
];

const DIFFICULTIES = [
  { label: "Ordinary", value: "O-Level standard", color: "#22c55e" },
  { label: "Advanced", value: "A-Level standard", color: "#f59e0b" },
  { label: "Challenge", value: "university entrance standard", color: "#ef4444" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

/* ───────────────────────── TYPES ───────────────────────── */

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

interface ExamResults {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  cortexInsight: string;
  results: any[];
  timeTaken: number;
}

type Step = "setup" | "generating" | "exam" | "marking" | "results";

/* ───────────────────────── COMPONENT ───────────────────────── */

export default function ExamSimulation() {
  const [step, setStep] = useState<Step>("setup");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [results, setResults] = useState<ExamResults | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const q = questions[currentQuestion]; // 🧠 ALWAYS SAFE ACCESS PATTERN

  /* ───────────────────────── AUTH ───────────────────────── */

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/auth/login");
    })();
  }, []);

  /* ───────────────────────── TIMER ───────────────────────── */

  useEffect(() => {
    if (step !== "exam") return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          handleSubmitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step]);

  /* ───────────────────────── GENERATE ───────────────────────── */

  const generateExam = async () => {
    setStep("generating");

    const res = await fetch("/api/exam/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        topic: topic || null,
        difficulty: DIFFICULTIES[difficulty].value,
        questionCount,
      }),
    });

    const data = await res.json();

    if (!data.questions) {
      setStep("setup");
      return;
    }

    setQuestions(data.questions);
    setAnswers([]);
    setCurrentQuestion(0);
    setCurrentAnswer("");

    const examTime = questionCount * 2 * 60;

    setTimeLeft(examTime);
    setTotalTime(examTime);

    setQuestionStartTime(Date.now());

    // 🧠 CRITICAL FIX: ensure state settles before render
    requestAnimationFrame(() => {
      setStep("exam");
    });
  };

  /* ───────────────────────── ANSWERS ───────────────────────── */

  const saveAnswer = () => {
    if (!q) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === q.id);

      const updated = {
        questionId: q.id,
        answer: currentAnswer,
        timeSpent,
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }

      return [...prev, updated];
    });
  };

  const goToQuestion = (i: number) => {
    saveAnswer();
    setCurrentQuestion(i);
    setQuestionStartTime(Date.now());

    const existing = answers.find((a) => a.questionId === questions[i]?.id);
    setCurrentAnswer(existing?.answer || "");
  };

  /* ───────────────────────── SUBMIT ───────────────────────── */

  const handleSubmitExam = async () => {
    saveAnswer();
    setStep("marking");

    const res = await fetch("/api/exam/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        difficulty: DIFFICULTIES[difficulty].value,
        questions,
        answers,
        timeTaken: totalTime - timeLeft,
      }),
    });

    const data = await res.json();
    setResults(data);
    setStep("results");
  };

  /* ───────────────────────── RENDER HELPERS ───────────────────────── */

  const renderMath = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, e) =>
        katex.renderToString(e, { displayMode: true })
      )
      .replace(/\$([^$]+)\$/g, (_, e) =>
        katex.renderToString(e, { displayMode: false })
      );
  };

  /* ───────────────────────── LOADING STATES ───────────────────────── */

  if (step === "generating") {
    return (
      <div style={{ padding: 40 }}>
        🧠 Generating exam...
      </div>
    );
  }

  if (step === "marking") {
    return (
      <div style={{ padding: 40 }}>
        🧠 Cortex is marking your exam...
      </div>
    );
  }

  /* ───────────────────────── EXAM SAFETY GUARD ───────────────────────── */

  if (step === "exam") {
    if (!q) {
      return (
        <div style={{ padding: 40 }}>
          Loading questions...
        </div>
      );
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          background: "var(--card)",
          borderBottom: "1px solid var(--card-border)",
          padding: 12,
          zIndex: 50
        }}>
          <b>{subject}</b>
          <div>{minutes}:{seconds}</div>
        </div>

        {/* BODY */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: `${HEADER_HEIGHT + 20}px 16px ${FOOTER_HEIGHT + 20}px`
        }}>
          <p dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />

          {q.type === "multiple_choice" && (
            <div>
              {q.options?.map((o, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentAnswer(o)}
                  style={{
                    display: "block",
                    width: "100%",
                    margin: "8px 0",
                    padding: 12,
                    background: currentAnswer === o ? "#6366f120" : "var(--muted)"
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}

          {q.type !== "multiple_choice" && (
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              style={{ width: "100%", minHeight: 120 }}
            />
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: FOOTER_HEIGHT,
          background: "var(--card)",
          borderTop: "1px solid var(--card-border)",
          paddingBottom: "env(safe-area-inset-bottom)"
        }}>
          <div style={{ display: "flex", gap: 8, padding: 12 }}>
            <button onClick={() => goToQuestion(currentQuestion - 1)}>
              Prev
            </button>

            {currentQuestion < questions.length - 1 ? (
              <button onClick={() => goToQuestion(currentQuestion + 1)} style={{ flex: 1 }}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmitExam} style={{ flex: 1, background: "#22c55e", color: "white" }}>
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── RESULTS ───────────────────────── */

  if (step === "results" && results) {
    return (
      <div style={{ padding: 40 }}>
        🎯 Score: {results.percentage}%
      </div>
    );
  }

  /* ───────────────────────── SETUP ───────────────────────── */

  return (
    <div style={{ padding: 40 }}>
      <h1>Exam Setup</h1>
      <button onClick={generateExam}>
        Start Exam
      </button>
    </div>
  );
}
