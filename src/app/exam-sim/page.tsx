"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ───────────────────────── DATA ───────────────────────── */

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

type Step = "setup" | "exam" | "marking" | "results";

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

  const [results, setResults] = useState<any>(null);
  const [userId, setUserId] = useState("");

  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionStart = useRef(Date.now());

  /* ───────────────────────── SAFE DERIVED STATE ───────────────────────── */

  const q = questions[currentQuestion] ?? null;
  const hasQuestions = questions.length > 0;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timePercent = totalTime ? (timeLeft / totalTime) * 100 : 100;

  /* ───────────────────────── MATH RENDER ───────────────────────── */

  function renderMath(text: string) {
    if (!text) return text;
    try {
      return text
        .replace(/\$\$([^$]+)\$\$/g, (_, expr) =>
          katex.renderToString(expr, { displayMode: true, throwOnError: false })
        )
        .replace(/\$([^$]+)\$/g, (_, expr) =>
          katex.renderToString(expr, { displayMode: false, throwOnError: false })
        );
    } catch {
      return text;
    }
  }

  /* ───────────────────────── AUTH INIT ───────────────────────── */

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");
      setUserId(user.id);
    };
    init();
  }, [router, supabase]);

  /* ───────────────────────── TIMER ───────────────────────── */

  useEffect(() => {
    if (step !== "exam") return;

    if (timeLeft <= 0) return;

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

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step, timeLeft]);

  /* ───────────────────────── EXAM FLOW ───────────────────────── */

  const generateExam = async () => {
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

    if (!Array.isArray(data.questions)) {
      alert("Invalid exam data");
      return;
    }

    setQuestions(data.questions);
    setAnswers([]);
    setCurrentQuestion(0);
    setCurrentAnswer("");

    const examTime = questionCount * 2 * 60;
    setTimeLeft(examTime);
    setTotalTime(examTime);

    setStep("exam");
  };

  const saveAnswer = () => {
    const q = questions[currentQuestion];
    if (!q) return;

    const timeSpent = Math.round((Date.now() - questionStart.current) / 1000);

    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === q.id);

      const updated = { questionId: q.id, answer: currentAnswer, timeSpent };

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
    questionStart.current = Date.now();

    const existing = answers.find(a => a.questionId === questions[i]?.id);
    setCurrentAnswer(existing?.answer || "");
  };

  const handleSubmitExam = async () => {
    saveAnswer();
    if (intervalRef.current) clearInterval(intervalRef.current);

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

  /* ───────────────────────── SCREENS ───────────────────────── */

  const SetupScreen = () => (
    <div style={{ padding: 24 }}>
      <h1>Exam Setup</h1>

      <button onClick={generateExam} disabled={!subject}>
        Start Exam
      </button>
    </div>
  );

  const ExamScreen = () => {
    if (!hasQuestions) return <div>Loading exam...</div>;
    if (!q) return <div>Loading question...</div>;

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

        {/* TOP BAR */}
        <div style={{ padding: 12 }}>
          {subject} — {DIFFICULTIES[difficulty].label}
          <div>{minutes}:{String(seconds).padStart(2, "0")}</div>
        </div>

        {/* QUESTION */}
        <div style={{ padding: 20 }}>
          <div dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />
        </div>

        {/* ANSWER */}
        {q.type === "multiple_choice" ? (
          q.options?.map((opt, i) => (
            <button key={i} onClick={() => setCurrentAnswer(opt)}>
              {opt}
            </button>
          ))
        ) : (
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
          />
        )}

        {/* NAV */}
        <div style={{ marginTop: "auto", padding: 12 }}>
          <button
            disabled={currentQuestion === 0}
            onClick={() => goToQuestion(currentQuestion - 1)}
          >
            Prev
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button onClick={() => goToQuestion(currentQuestion + 1)}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmitExam}>
              Submit ✓
            </button>
          )}
        </div>

      </div>
    );
  };

  const MarkingScreen = () => (
    <div style={{ padding: 40 }}>Cortex is marking...</div>
  );

  const ResultsScreen = () => (
    <div style={{ padding: 40 }}>
      <h1>Results</h1>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );

  /* ───────────────────────── SAFE ROUTER ───────────────────────── */

  const screens: Record<Step, JSX.Element> = {
    setup: <SetupScreen />,
    exam: <ExamScreen />,
    marking: <MarkingScreen />,
    results: <ResultsScreen />,
  };

  return screens[step];
}
