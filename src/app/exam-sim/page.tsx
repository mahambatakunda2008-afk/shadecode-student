"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

function renderMath(text: string) {
  if (!text) return text;

  try {
    return text
      .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        try {
          return katex.renderToString(expr, {
            displayMode: true,
            throwOnError: false,
          });
        } catch {
          return expr;
        }
      })
      .replace(/\$([^$]+)\$/g, (_, expr) => {
        try {
          return katex.renderToString(expr, {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          return expr;
        }
      });
  } catch {
    return text;
  }
}

export default function ExamSimulation() {
  const router = useRouter();
  const supabase = createClient();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);

  const [results, setResults] = useState<ExamResults | null>(null);

  const [userId, setUserId] = useState("");

  const q = questions[currentQuestion];

  /* ───────────────────────── AUTH ───────────────────────── */

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

  /* ───────────────────────── TIMER ───────────────────────── */

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

  /* ───────────────────────── STYLES ───────────────────────── */

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

  /* ───────────────────────── FUNCTIONS ───────────────────────── */

  const saveAnswer = () => {
    if (!q) return;

    const timeSpent = Math.round(
      (Date.now() - questionStartTime) / 1000
    );

    const answerPayload: Answer = {
      questionId: q.id,
      answer: currentAnswer,
      timeSpent,
    };

    setAnswers((prev) => {
      const exists = prev.findIndex(
        (a) => a.questionId === q.id
      );

      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = answerPayload;
        return updated;
      }

      return [...prev, answerPayload];
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

    setGenerating(true);

    try {
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
        throw new Error("No questions generated");
      }

      setQuestions(data.questions);

      setCurrentQuestion(0);
      setCurrentAnswer("");
      setAnswers([]);

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
    saveAnswer();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setStep("marking");
    setMarking(true);

    try {
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

    setCurrentQuestion(0);
    setCurrentAnswer("");

    setResults(null);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const timePercent =
    totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;

  /* ───────────────────────── SETUP ───────────────────────── */

  if (step === "setup") {
    return (
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          padding: "40px 20px 120px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: 900,
              marginBottom: "6px",
            }}
          >
            Exam Simulation
          </h1>

          <p
            style={{
              color: "var(--muted-foreground)",
              fontSize: "14px",
            }}
          >
            Cortex-generated exams with live marking 🧠
          </p>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            Subject
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border:
                    subject === s
                      ? "1px solid var(--primary)"
                      : "1px solid transparent",
                  background:
                    subject === s
                      ? "rgba(99,102,241,0.15)"
                      : "var(--muted)",
                  color:
                    subject === s
                      ? "var(--primary)"
                      : "var(--foreground)",
                  cursor: "pointer",
                  fontWeight: 600,
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
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Topic
          </p>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Optional topic..."
            style={inputStyle}
          />
        </div>

        <div style={cardStyle}>
          <p
            style={{
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Difficulty
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
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
                  border:
                    difficulty === i
                      ? `1px solid ${d.color}`
                      : "1px solid transparent",
                  background:
                    difficulty === i
                      ? `${d.color}20`
                      : "var(--muted)",
                  color:
                    difficulty === i
                      ? d.color
                      : "var(--foreground)",
                  fontWeight: 700,
                  cursor: "pointer",
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
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Questions
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border:
                    questionCount === n
                      ? "1px solid var(--primary)"
                      : "1px solid transparent",
                  background:
                    questionCount === n
                      ? "rgba(99,102,241,0.15)"
                      : "var(--muted)",
                  color:
                    questionCount === n
                      ? "var(--primary)"
                      : "var(--foreground)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateExam}
          disabled={!subject || generating}
          style={{
            background: "var(--primary)",
            border: "none",
            borderRadius: "14px",
            padding: "16px",
            fontWeight: 800,
            fontSize: "16px",
            color: "white",
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

  /* ───────────────────────── EXAM ───────────────────────── */

  if (step === "exam" && q) {
    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          minHeight: "100vh",
          position: "relative",
          paddingBottom: "180px",
        }}
      >
        {/* TOP BAR */}

        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "var(--background)",
            padding: "16px",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <p
              style={{
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              {subject}
            </p>

            <p
              style={{
                fontWeight: 900,
                fontSize: "18px",
              }}
            >
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>
          </div>

          <div
            style={{
              height: "5px",
              background: "var(--muted)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${timePercent}%`,
                height: "100%",
                background: "var(--primary)",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* CONTENT */}

        <div
          style={{
            padding: "20px",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted-foreground)",
                marginBottom: "10px",
              }}
            >
              Question {currentQuestion + 1} of{" "}
              {questions.length}
            </p>

            <div
              style={{
                fontSize: "16px",
                lineHeight: 1.7,
                fontWeight: 600,
              }}
              dangerouslySetInnerHTML={{
                __html: renderMath(q.question),
              }}
            />
          </div>

          {/* MCQ */}

          {q.type === "multiple_choice" &&
            q.options && (
              <div
                style={{
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
                      borderRadius: "12px",
                      border:
                        currentAnswer === option
                          ? "1px solid var(--primary)"
                          : "1px solid var(--card-border)",
                      background:
                        currentAnswer === option
                          ? "rgba(99,102,241,0.15)"
                          : "var(--card)",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--foreground)",
                    }}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderMath(option),
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

          {/* TEXT */}

          {(q.type === "short_answer" ||
            q.type === "structured") && (
            <textarea
              value={currentAnswer}
              onChange={(e) =>
                setCurrentAnswer(e.target.value)
              }
              rows={q.type === "structured" ? 8 : 4}
              placeholder="Write your answer..."
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          )}
        </div>

        {/* FIXED NAVIGATION */}

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "var(--background)",
            borderTop: "1px solid var(--card-border)",
            padding: "16px",
          }}
        >
          <div
            style={{
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            {/* QUESTION DOTS */}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "14px",
              }}
            >
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    background:
                      i === currentQuestion
                        ? "var(--primary)"
                        : "var(--muted)",
                    color:
                      i === currentQuestion
                        ? "white"
                        : "var(--foreground)",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              {currentQuestion > 0 && (
                <button
                  onClick={() =>
                    goToQuestion(currentQuestion - 1)
                  }
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "var(--muted)",
                    color: "var(--foreground)",
                    fontWeight: 700,
                    cursor: "pointer",
                    minHeight: "52px",
                  }}
                >
                  ← Previous
                </button>
              )}

              {currentQuestion <
              questions.length - 1 ? (
                <button
                  onClick={() =>
                    goToQuestion(currentQuestion + 1)
                  }
                  style={{
                    flex: 2,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "var(--primary)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: "pointer",
                    minHeight: "52px",
                    boxShadow:
                      "0 0 24px rgba(99,102,241,0.35)",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  style={{
                    flex: 2,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#22c55e",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: "pointer",
                    minHeight: "52px",
                    boxShadow:
                      "0 0 24px rgba(34,197,94,0.35)",
                  }}
                >
                  Submit Exam ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── MARKING ───────────────────────── */

  if (step === "marking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontSize: "60px",
            animation: "spin 2s linear infinite",
          }}
        >
          🧠
        </div>

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>

        <h2
          style={{
            fontSize: "24px",
            fontWeight: 900,
          }}
        >
          Cortex is marking...
        </h2>
      </div>
    );
  }

  /* ───────────────────────── RESULTS ───────────────────────── */

  if (step === "results" && results) {
    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "40px 20px 120px",
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
              fontSize: "60px",
              fontWeight: 900,
              color: "#22c55e",
            }}
          >
            {results.percentage}%
          </h1>

          <p
            style={{
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {results.grade}
          </p>
        </div>

        <button
          onClick={resetExam}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          New Exam
        </button>
      </div>
    );
  }

  return null;
}
