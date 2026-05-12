"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // ✅ MUST be above usage
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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");
      setUserId(user.id);
    };
    init();
  }, [router, supabase]);

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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step, timeLeft]);

  const generateExam = async () => {
    if (!subject) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topic.trim() || null,
          difficulty: DIFFICULTIES[difficulty].value,
          questionCount,
        }),
      });

      const data = await res.json();
      setQuestions(data.questions || []);

      const examTime = questionCount * 2 * 60;
      setTimeLeft(examTime);
      setTotalTime(examTime);
      setCurrentQuestion(0);
      setCurrentAnswer("");
      setAnswers([]);
      setStep("exam");
    } finally {
      setGenerating(false);
    }
  };

  const saveAnswer = () => {
    const q = questions[currentQuestion];
    if (!q) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === q.id);
      const newAns = { questionId: q.id, answer: currentAnswer, timeSpent };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newAns;
        return copy;
      }
      return [...prev, newAns];
    });
  };

  const goToQuestion = (i: number) => {
    saveAnswer();
    setCurrentQuestion(i);
    setQuestionStartTime(Date.now());
    setCurrentAnswer(answers.find(a => a.questionId === questions[i]?.id)?.answer || "");
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

  const q = questions[currentQuestion];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timePercent = totalTime ? (timeLeft / totalTime) * 100 : 100;

  // ───────── EXAM SCREEN (FIXED) ─────────
  if (step === "exam" && q) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* TOP BAR */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: 12, background: "#111", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{subject}</span>
            <span>{minutes}:{String(seconds).padStart(2, "0")}</span>
          </div>
        </div>

        {/* QUESTION */}
        <div style={{ paddingTop: 80, flex: 1, padding: 20 }}>
          <div dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />

          {q.type === "multiple_choice" && q.options?.map((opt, i) => (
            <button key={i} onClick={() => setCurrentAnswer(opt)}>
              {opt}
            </button>
          ))}

          {q.type !== "multiple_choice" && (
            <textarea
              value={currentAnswer}
              onChange={e => setCurrentAnswer(e.target.value)}
              style={{ width: "100%" }}
            />
          )}
        </div>

        {/* NAV */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 12, background: "#111" }}>
          <button disabled={currentQuestion === 0} onClick={() => goToQuestion(currentQuestion - 1)}>
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
  }

  return null;
}
