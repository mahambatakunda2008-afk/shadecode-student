"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ───────────────────────────────────────────────────────────── */
/* TYPES */
/* ───────────────────────────────────────────────────────────── */

type Step = "setup" | "exam" | "marking" | "results";

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

/* ───────────────────────────────────────────────────────────── */
/* DATA */
/* ───────────────────────────────────────────────────────────── */

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Economics",
  "Computer Science",
  "English Language",
  "English Literature",
  "Accounting",
  "Business Studies",
  "Sociology",
  "Psychology",
];

const DIFFICULTIES = [
  {
    label: "Ordinary",
    value: "O-Level standard",
    color: "#22c55e",
  },
  {
    label: "Advanced",
    value: "A-Level standard",
    color: "#f59e0b",
  },
  {
    label: "Challenge",
    value: "beyond A-Level, university entrance standard",
    color: "#ef4444",
  },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

/* ───────────────────────────────────────────────────────────── */
/* HELPERS */
/* ───────────────────────────────────────────────────────────── */

function renderMath(text: string) {
  if (!text) return "";

  try {
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        return katex.renderToString(expr, {
          displayMode: true,
          throwOnError: false,
        });
      })
      .replace(/\$([^$]+)\$/g, (_, expr) => {
        return katex.renderToString(expr, {
          displayMode: false,
          throwOnError: false,
        });
      });
  } catch {
    return text;
  }
}

/* ───────────────────────────────────────────────────────────── */
/* COMPONENT */
/* ───────────────────────────────────────────────────────────── */

export default function ExamSimulation() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* STATE */

  const [step, setStep] = useState<Step>("setup");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [results, setResults] = useState<ExamResults | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const [questionStartTime, setQuestionStartTime] =
    useState(Date.now());

  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);

  const [userId, setUserId] = useState("");

  /* DERIVED */

  const q = questions[currentQuestion];

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const timePercent =
    totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;

  /* ───────────────────────────────────────────────────────────── */
  /* AUTH */
  /* ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);
    };

    init();
  }, [router, supabase]);

  /* ───────────────────────────────────────────────────────────── */
  /* TIMER */
  /* ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (step !== "exam") return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleSubmitExam();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [step]);

  /* ───────────────────────────────────────────────────────────── */
  /* ACTIONS */
  /* ───────────────────────────────────────────────────────────── */

  const saveAnswer = () => {
    if (!q) return;

    const timeSpent = Math.round(
      (Date.now() - questionStartTime) / 1000
    );

    const payload: Answer = {
      questionId: q.id,
      answer: currentAnswer,
      timeSpent,
    };

    setAnswers((prev) => {
      const existing = prev.findIndex(
        (a) => a.questionId === q.id
      );

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = payload;
        return updated;
      }

      return [...prev, payload];
    });
  };

  const goToQuestion = (index: number) => {
    saveAnswer();

    setCurrentQuestion(index);

    const existing = answers.find(
      (a) => a.questionId === questions[index]?.id
    );

    setCurrentAnswer(existing?.answer || "");

    setQuestionStartTime(Date.now());
  };

  const generateExam = async () => {
    if (!subject) return;

    try {
      setGenerating(true);

      const response = await fetch("/api/exam/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          topic: topic.trim() || null,
          difficulty: DIFFICULTIES[difficulty].value,
          questionCount,
        }),
      });

      const data = await response.json();

      if (!data.questions) {
        throw new Error("No questions returned");
      }

      setQuestions(data.questions);
      setAnswers([]);
      setCurrentQuestion(0);
      setCurrentAnswer("");

      const examTime = questionCount * 2 * 60;

      setTimeLeft(examTime);
      setTotalTime(examTime);

      setQuestionStartTime(Date.now());

      setStep("exam");
    } catch (error) {
      console.error(error);
      alert("Failed to generate exam.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitExam = async () => {
    try {
      saveAnswer();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setStep("marking");
      setMarking(true);

      const response = await fetch("/api/exam/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          difficulty: DIFFICULTIES[difficulty].value,
          questions,
          answers,
          timeTaken: totalTime - timeLeft,
        }),
      });

      const data = await response.json();

      setResults(data);

      if (userId) {
        await supabase.from("exam_results").insert({
          user_id: userId,
          subject,
          topic: topic || null,
          difficulty: DIFFICULTIES[difficulty].label,
          score: data.percentage,
          total_questions: questions.length,
          correct_answers:
            data.results?.filter((r: Result) => r.correct)
              .length || 0,
          weak_areas: data.weakAreas,
          time_taken: totalTime - timeLeft,
          created_at: new Date().toISOString(),
        });
      }

      setStep("results");
    } catch (error) {
      console.error(error);
      alert("Failed to mark exam.");
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

  /* ───────────────────────────────────────────────────────────── */
  /* STYLES */
  /* ───────────────────────────────────────────────────────────── */

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  /* ───────────────────────────────────────────────────────────── */
  /* SETUP SCREEN */
  /* ───────────────────────────────────────────────────────────── */

  function SetupScreen() {
    return (
      <div
        style={{
          padding: "60px 24px 100px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <div>
          <p
            style={{
              color: "var(--primary)",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Shadecode Student
          </p>

          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Exam Simulation
          </h1>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              marginBottom: "10px",
              fontWeight: 700,
            }}
          >
            Subject
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background:
                    subject === s
                      ? "var(--primary)"
                      : "var(--muted)",
                  color:
                    subject === s
                      ? "white"
                      : "var(--foreground)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              marginBottom: "8px",
              fontWeight: 700,
            }}
          >
            Topic
          </p>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </div>

        <div style={cardStyle}>
          <p
            style={{
              marginBottom: "8px",
              fontWeight: 700,
            }}
          >
            Difficulty
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setDifficulty(i)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  background:
                    difficulty === i
                      ? d.color
                      : "var(--muted)",
                  color:
                    difficulty === i
                      ? "white"
                      : "var(--foreground)",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              marginBottom: "8px",
              fontWeight: 700,
            }}
          >
            Questions
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  background:
                    questionCount === count
                      ? "var(--primary)"
                      : "var(--muted)",
                  color:
                    questionCount === count
                      ? "white"
                      : "var(--foreground)",
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateExam}
          disabled={!subject || generating}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "16px",
            fontWeight: 800,
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {generating
            ? "Generating..."
            : "Start Exam →"}
        </button>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────────── */
  /* EXAM SCREEN */
  /* ───────────────────────────────────────────────────────────── */

  function ExamScreen() {
    if (!q) return null;

    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "80px 20px 160px",
        }}
      >
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "var(--card)",
            borderBottom:
              "1px solid var(--card-border)",
            padding: "16px",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <p>{subject}</p>

            <p>
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>
          </div>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              marginBottom: "16px",
              fontWeight: 700,
            }}
          >
            Question {currentQuestion + 1}
          </p>

          <div
            dangerouslySetInnerHTML={{
              __html: renderMath(q.question),
            }}
          />

          {q.type === "multiple_choice" &&
            q.options && (
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {q.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setCurrentAnswer(option)
                    }
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      background:
                        currentAnswer === option
                          ? "var(--primary)"
                          : "var(--muted)",
                      color:
                        currentAnswer === option
                          ? "white"
                          : "var(--foreground)",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

          {(q.type === "short_answer" ||
            q.type === "structured") && (
            <textarea
              value={currentAnswer}
              onChange={(e) =>
                setCurrentAnswer(e.target.value)
              }
              rows={8}
              style={{
                ...inputStyle,
                marginTop: "20px",
              }}
            />
          )}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px",
            background: "var(--card)",
            borderTop:
              "1px solid var(--card-border)",
            display: "flex",
            gap: "10px",
            zIndex: 100,
          }}
        >
          {currentQuestion > 0 && (
            <button
              onClick={() =>
                goToQuestion(currentQuestion - 1)
              }
              style={{
                padding: "12px 16px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              ← Prev
            </button>
          )}

          {currentQuestion <
          questions.length - 1 ? (
            <button
              onClick={() =>
                goToQuestion(currentQuestion + 1)
              }
              style={{
                flex: 1,
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              style={{
                flex: 1,
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Submit Exam ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────────── */
  /* MARKING SCREEN */
  /* ───────────────────────────────────────────────────────────── */

  function MarkingScreen() {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <h1>🧠 Cortex is marking...</h1>

        <p
          style={{
            color: "var(--muted-foreground)",
          }}
        >
          Analysing answers...
        </p>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────────── */
  /* RESULTS SCREEN */
  /* ───────────────────────────────────────────────────────────── */

  function ResultsScreen() {
    if (!results) return null;

    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "60px 24px 100px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
            }}
          >
            {results.percentage}%
          </h1>

          <p>{results.grade}</p>
        </div>

        <div style={cardStyle}>
          <h2
            style={{
              marginBottom: "10px",
            }}
          >
            Cortex Insight
          </h2>

          <p>{results.cortexInsight}</p>
        </div>

        <button
          onClick={resetExam}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          New Exam
        </button>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────────── */
  /* SAFE SCREEN ROUTER */
  /* ───────────────────────────────────────────────────────────── */

  const screens: Record<Step, React.ReactNode> = {
    setup: <SetupScreen />,
    exam: <ExamScreen />,
    marking: <MarkingScreen />,
    results: <ResultsScreen />,
  };

  return <>{screens[step]}</>;
}
