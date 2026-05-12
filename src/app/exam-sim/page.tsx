"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ---------------- DATA ---------------- */

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

/* ---------------- TYPES ---------------- */

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

/* ---------------- COMPONENT ---------------- */

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

  const [results, setResults] = useState<ExamResults | null>(null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);

  const questionStartTime = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const userIdRef = useRef("");

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/auth/login");
      else userIdRef.current = user.id;
    })();
  }, [router, supabase]);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    if (step !== "exam") return;

    if (intervalRef.current) clearInterval(intervalRef.current);

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
  }, [step]);

  /* ---------------- EXAM GENERATION ---------------- */

  const generateExam = async () => {
    if (!subject) return;
    setGenerating(true);

    try {
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
      if (!data.questions) throw new Error("No questions");

      setQuestions(data.questions);
      setAnswers([]);
      setCurrentQuestion(0);
      setCurrentAnswer("");

      const examTime = questionCount * 2 * 60;
      setTimeLeft(examTime);
      setTotalTime(examTime);

      setStep("exam");
      questionStartTime.current = Date.now();
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- ANSWERS ---------------- */

  const saveAnswer = () => {
    const q = questions[currentQuestion];
    if (!q) return;

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === q.id);
      const updated = { questionId: q.id, answer: currentAnswer, timeSpent };

      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = updated;
        return copy;
      }

      return [...prev, updated];
    });
  };

  const goToQuestion = (i: number) => {
    saveAnswer();
    setCurrentQuestion(i);
    questionStartTime.current = Date.now();

    const existing = answers.find(a => a.questionId === questions[i]?.id);
    setCurrentAnswer(existing?.answer || "");
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmitExam = async () => {
    saveAnswer();
    setStep("marking");
    setMarking(true);

    try {
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
    } finally {
      setMarking(false);
    }
  };

  const reset = () => {
    setStep("setup");
    setQuestions([]);
    setAnswers([]);
    setResults(null);
    setCurrentAnswer("");
    setCurrentQuestion(0);
  };

  const q = questions[currentQuestion];

  const renderMath = (text: string) => {
    if (!text) return text;
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, e) => katex.renderToString(e, { displayMode: true }))
      .replace(/\$([^$]+)\$/g, (_, e) => katex.renderToString(e, { displayMode: false }));
  };

  /* ---------------- SINGLE RETURN FIX ---------------- */

  return (
    <>
      {step === "setup" && (
        <div style={{ padding: 40 }}>
          <h1>Exam Setup</h1>
          <button onClick={generateExam} disabled={generating}>
            Start Exam
          </button>
        </div>
      )}

      {step === "exam" && q && (
        <div style={{ padding: 20 }}>
          <h2 dangerouslySetInnerHTML={{ __html: renderMath(q.question) }} />

          {q.type === "multiple_choice" && q.options?.map((o, i) => (
            <button key={i} onClick={() => setCurrentAnswer(o)}>
              {o}
            </button>
          ))}

          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
          />

          <button onClick={handleSubmitExam}>Submit</button>
        </div>
      )}

      {step === "marking" && <div>Marking...</div>}

      {step === "results" && results && (
        <div>
          <h1>{results.percentage}%</h1>
          <button onClick={reset}>New Exam</button>
        </div>
      )}
    </>
  );
}
