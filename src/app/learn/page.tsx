"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import LessonBlock from "./components/LessonBlock";

interface Subject {
  id: string;
  name: string;
}

interface StudyTopic {
  id: string;
  subject: string;
  topic: string;
  created_at: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface LessonBlockType {
  type: string;
  title?: string;
  content: string;
}

interface LessonResponse {
  blocks: LessonBlockType[];
}

interface MathResult {
  problem: string;
  score: number;
  correct: boolean;
  cortexInsight: string;
  steps: {
    description: string;
    status: string;
    note?: string;
  }[];
}

export default function Learn() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [lesson, setLesson] =
    useState<LessonResponse | null>(null);

  const [questions, setQuestions] = useState<
    QuizQuestion[]
  >([]);

  const [answers, setAnswers] = useState<{
    [key: number]: number;
  }>({});

  const [submitted, setSubmitted] = useState(false);

  const [studiedTopics, setStudiedTopics] = useState<
    StudyTopic[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [
    step,
    setStep,
  ] = useState<
    | "input"
    | "lesson"
    | "quiz"
    | "results"
    | "mathcheck"
  >("input");

  // Math checker
  const [mathQuestion, setMathQuestion] =
    useState("");

  const [mathImage, setMathImage] =
    useState<File | null>(null);

  const [mathPreview, setMathPreview] =
    useState<string | null>(null);

  const [mathResult, setMathResult] =
    useState<MathResult | null>(null);

  const [mathLoading, setMathLoading] =
    useState(false);

  const [mathError, setMathError] = useState<
    string | null
  >(null);

  const [dragging, setDragging] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const router = useRouter();
  const supabase = createClient();

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

      const [
        { data: subjectsData },
        { data: topicsData },
      ] = await Promise.all([
        supabase
          .from("subjects")
          .select("*")
          .eq("user_id", user.id),

        supabase
          .from("study_topics")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      setSubjects(subjectsData || []);
      setStudiedTopics(topicsData || []);

      setPageLoading(false);
    };

    init();
  }, []);

  const generateLesson = async () => {
    if (!selectedSubject || !topic.trim()) return;

    setLoading(true);
    setStep("lesson");

    setLesson(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: "lesson",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });

      const data = await response.json();

      setLesson(data);

      if (userId) {
        const { data: saved } = await supabase
          .from("study_topics")
          .insert({
            user_id: userId,
            subject: selectedSubject,
            topic: topic.trim(),
          })
          .select()
          .single();

        if (saved) {
          setStudiedTopics((prev) =>
            [saved, ...prev].slice(0, 10)
          );
        }
      }
    } catch {
      setLesson({
        blocks: [
          {
            type: "warning",
            title: "Generation failed",
            content:
              "Could not generate lesson.",
          },
        ],
      });
    }

    setLoading(false);
  };

  const generateQuiz = async () => {
    setLoading(true);

    setStep("quiz");

    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch("/api/learn", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: "quiz",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });

      const data = await response.json();

      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    }

    setLoading(false);
  };

  const submitQuiz = () => {
    setSubmitted(true);
    setStep("results");
  };

  // math handlers
  const handleMathFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setMathImage(file);

    setMathResult(null);
    setMathError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      setMathPreview(
        e.target?.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      setDragging(false);

      if (e.dataTransfer.files[0]) {
        handleMathFile(
          e.dataTransfer.files[0]
        );
      }
    },
    []
  );

  const analyzeMath = async () => {
    if (!mathImage) return;

    setMathLoading(true);
    setMathError(null);
    setMathResult(null);

    try {
      const formData = new FormData();

      formData.append("image", mathImage);
      formData.append("topic", topic);
      formData.append(
        "subject",
        selectedSubject
      );

      formData.append(
        "question",
        mathQuestion
      );

      if (userId) {
        formData.append("userId", userId);
      }

      const res = await fetch(
        "/api/math-checker",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Analysis failed");
      }

      const data = await res.json();

      setMathResult(data);
    } catch {
      setMathError(
        "Could not analyse the image."
      );
    } finally {
      setMathLoading(false);
    }
  };

  const resetMath = () => {
    setMathImage(null);
    setMathPreview(null);
    setMathResult(null);
    setMathError(null);
    setMathQuestion("");
  };

  const score = questions.filter(
    (q, i) => answers[i] === q.correct
  ).length;

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
  };

  const primaryBtn = {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  };

  const mutedBtn = {
    background: "var(--muted)",
    color: "var(--muted-foreground)",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  };

  if (pageLoading) {
    return (
      <div
        style={{
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "60px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
          }}
        >
          Learn
        </h1>

        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "14px",
            marginTop: "4px",
          }}
        >
          AI-powered learning system
        </p>
      </div>

      {/* INPUT */}
      {step === "input" && (
        <div style={cardStyle}>
          <p
            style={{
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            What do you want to study?
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select subject...
              </option>

              {subjects.map((s) => (
                <option
                  key={s.id}
                  value={s.name}
                >
                  {s.name}
                </option>
              ))}

              <option value="General">
                General
              </option>
            </select>

            <input
              placeholder="e.g. Differentiation"
              value={topic}
              onChange={(e) =>
                setTopic(e.target.value)
              }
              style={inputStyle}
            />

            <button
              onClick={generateLesson}
              style={primaryBtn}
            >
              Generate Lesson →
            </button>
          </div>
        </div>
      )}

      {/* LESSON */}
      {step === "lesson" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {loading ? (
            <div style={cardStyle}>
              Generating lesson...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {lesson?.blocks?.map(
                  (block, index) => (
                    <LessonBlock
                      key={index}
                      type={block.type}
                      title={block.title}
                      content={block.content}
                    />
                  )
                )}
              </div>

              <button
                onClick={generateQuiz}
                style={primaryBtn}
              >
                Practice Questions →
              </button>
            </>
          )}
        </div>
      )}

      {/* QUIZ */}
      {step === "quiz" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {questions.map((q, qi) => (
            <div
              key={qi}
              style={cardStyle}
            >
              <p
                style={{
                  fontWeight: 700,
                  marginBottom: "10px",
                }}
              >
                {qi + 1}. {q.question}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {q.options.map(
                  (option, oi) => {
                    const selected =
                      answers[qi] === oi;

                    return (
                      <button
                        key={oi}
                        onClick={() =>
                          setAnswers({
                            ...answers,
                            [qi]: oi,
                          })
                        }
                        style={{
                          padding:
                            "10px 12px",
                          borderRadius:
                            "8px",
                          border:
                            selected
                              ? "1px solid var(--primary)"
                              : "1px solid transparent",
                          background:
                            selected
                              ? "rgba(99,102,241,0.1)"
                              : "var(--muted)",
                          textAlign:
                            "left",
                          cursor:
                            "pointer",
                        }}
                      >
                        {option}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          ))}

          {questions.length > 0 && (
            <button
              onClick={submitQuiz}
              style={primaryBtn}
            >
              Submit Answers
            </button>
          )}
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={cardStyle}>
            <h2>
              Score: {score}/
              {questions.length}
            </h2>
          </div>

          <button
            onClick={() => {
              resetMath();
              setStep("mathcheck");
            }}
            style={primaryBtn}
          >
            Show My Working →
          </button>
        </div>
      )}

      {/* MATH CHECK */}
      {step === "mathcheck" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={cardStyle}>
            {!mathPreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() =>
                  setDragging(false)
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                style={{
                  border:
                    "2px dashed var(--card-border)",
                  borderRadius: "12px",
                  padding: "2rem",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                Upload your working
              </div>
            ) : (
              <img
                src={mathPreview}
                alt="Working"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                }}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] &&
                handleMathFile(
                  e.target.files[0]
                )
              }
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] &&
                handleMathFile(
                  e.target.files[0]
                )
              }
            />

            {mathPreview && (
              <button
                onClick={analyzeMath}
                style={{
                  ...primaryBtn,
                  width: "100%",
                  marginTop: "12px",
                }}
              >
                Analyse My Working
              </button>
            )}
          </div>

          {mathResult && (
            <div style={cardStyle}>
              <h3>
                Score: {mathResult.score}%
              </h3>

              <p>
                {
                  mathResult.cortexInsight
                }
              </p>

              {mathResult.steps?.map(
                (step, i) => (
                  <div
                    key={i}
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "8px",
                      background:
                        "var(--muted)",
                    }}
                  >
                    <strong>
                      Step {i + 1}
                    </strong>

                    <p>
                      {
                        step.description
                      }
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
