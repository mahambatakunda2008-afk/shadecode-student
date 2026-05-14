"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

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

interface LessonBlock {
  type:
    | "intro"
    | "concept"
    | "example"
    | "tip"
    | "warning"
    | "summary"
    | "reflection"
    | "formula";

  title?: string;
  content: string;

  formula?: string;

  example?: {
    question: string;
    answer: string;
  };
}

interface LessonResponse {
  blocks: LessonBlock[];
  xpReward: number;
  difficulty: "guided" | "standard" | "challenge";
}

export default function Learn() {
  const router = useRouter();
  const supabase = createClient();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [lesson, setLesson] = useState<LessonResponse | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  const [studiedTopics, setStudiedTopics] = useState<StudyTopic[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  const [learningMode, setLearningMode] = useState<
    "guided" | "standard" | "challenge"
  >("standard");

  const [reflection, setReflection] = useState("");

  const [step, setStep] = useState<
    "input" | "lesson" | "quiz" | "results" | "mathcheck"
  >("input");

  // math checker
  const [mathQuestion, setMathQuestion] = useState("");
  const [mathImage, setMathImage] = useState<File | null>(null);
  const [mathPreview, setMathPreview] = useState<string | null>(null);
  const [mathResult, setMathResult] = useState<MathResult | null>(null);
  const [mathLoading, setMathLoading] = useState(false);
  const [mathError, setMathError] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

      const [{ data: subjectsData }, { data: topicsData }] =
        await Promise.all([
          supabase
            .from("subjects")
            .select("*")
            .eq("user_id", user.id),

          supabase
            .from("study_topics")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
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
          mode: learningMode,
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
          setStudiedTopics((prev) => [saved, ...prev].slice(0, 10));
        }
      }
    } catch {
      setLesson(null);
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
          mode: learningMode,
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

  // math upload
  const handleMathFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    setMathImage(file);
    setMathResult(null);
    setMathError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      setMathPreview(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    setDragging(false);

    if (e.dataTransfer.files[0]) {
      handleMathFile(e.dataTransfer.files[0]);
    }
  }, []);

  const analyzeMath = async () => {
    if (!mathImage) return;

    setMathLoading(true);
    setMathResult(null);
    setMathError(null);

    try {
      const formData = new FormData();

      formData.append("image", mathImage);
      formData.append("topic", topic);
      formData.append("subject", selectedSubject);
      formData.append("question", mathQuestion);

      if (userId) {
        formData.append("userId", userId);
      }

      const res = await fetch("/api/math-checker", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Analysis failed");
      }

      const data = await res.json();

      setMathResult(data);
    } catch {
      setMathError("Could not analyse the image.");
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
    borderRadius: "16px",
    padding: "18px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
  };

  const primaryBtn = {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  };

  const mutedBtn = {
    background: "var(--muted)",
    color: "var(--foreground)",
    border: "none",
    borderRadius: "10px",
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
            fontSize: "32px",
            fontWeight: 900,
          }}
        >
          AI Learn
        </h1>

        <p
          style={{
            color: "var(--muted-foreground)",
            marginTop: "4px",
            fontSize: "14px",
          }}
        >
          Adaptive AI-powered learning
        </p>
      </div>

      {/* INPUT */}
      {step === "input" && (
        <div style={cardStyle}>
          <p
            style={{
              fontWeight: 800,
              marginBottom: "14px",
            }}
          >
            What do you want to study?
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(e.target.value)
              }
              style={inputStyle}
            >
              <option value="">Select subject...</option>

              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}

              <option value="General">General</option>
            </select>

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && generateLesson()
              }
              placeholder="Differentiation, Electricity..."
              style={inputStyle}
            />

            {/* MODES */}
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              {[
                "guided",
                "standard",
                "challenge",
              ].map((mode) => (
                <button
                  key={mode}
                  onClick={() =>
                    setLearningMode(mode as any)
                  }
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",

                    border:
                      learningMode === mode
                        ? "1px solid var(--primary)"
                        : "1px solid var(--card-border)",

                    background:
                      learningMode === mode
                        ? "rgba(99,102,241,0.15)"
                        : "var(--muted)",

                    color:
                      learningMode === mode
                        ? "var(--primary)"
                        : "var(--foreground)",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={generateLesson}
              disabled={
                !selectedSubject || !topic.trim()
              }
              style={{
                ...primaryBtn,
                opacity:
                  !selectedSubject || !topic.trim()
                    ? 0.5
                    : 1,
              }}
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
          <button
            onClick={() => setStep("input")}
            style={mutedBtn}
          >
            ← Back
          </button>

          {loading && (
            <div style={cardStyle}>
              Generating lesson...
            </div>
          )}

          {!loading &&
            lesson?.blocks.map((block, i) => (
              <div
                key={i}
                style={{
                  ...cardStyle,

                  background:
                    block.type === "tip"
                      ? "rgba(34,197,94,0.08)"
                      : block.type === "warning"
                      ? "rgba(239,68,68,0.08)"
                      : "var(--card)",
                }}
              >
                {block.title && (
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      marginBottom: "10px",
                    }}
                  >
                    {block.title}
                  </h3>
                )}

                <p
                  style={{
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                  }}
                >
                  {block.content}
                </p>

                {block.formula && (
                  <div
                    style={{
                      marginTop: "16px",
                      overflowX: "auto",
                    }}
                  >
                    <BlockMath math={block.formula} />
                  </div>
                )}

                {block.example && (
                  <div
                    style={{
                      marginTop: "14px",
                      background: "var(--muted)",
                      padding: "14px",
                      borderRadius: "10px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 700,
                        marginBottom: "6px",
                      }}
                    >
                      Example
                    </p>

                    <p>
                      {block.example.question}
                    </p>

                    <p
                      style={{
                        marginTop: "8px",
                        color: "var(--primary)",
                        fontWeight: 700,
                      }}
                    >
                      {block.example.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}

          {!loading && lesson && (
            <>
              {/* reflection */}
              <div style={cardStyle}>
                <p
                  style={{
                    fontWeight: 800,
                    marginBottom: "10px",
                  }}
                >
                  Reflection
                </p>

                <textarea
                  value={reflection}
                  onChange={(e) =>
                    setReflection(e.target.value)
                  }
                  placeholder="Explain this topic in your own words..."
                  style={{
                    ...inputStyle,
                    minHeight: "120px",
                    resize: "vertical",
                  }}
                />
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
            <div key={qi} style={cardStyle}>
              <p
                style={{
                  fontWeight: 700,
                  marginBottom: "12px",
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
                {q.options.map((option, oi) => {
                  const isSelected =
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
                        padding: "12px",
                        borderRadius: "10px",
                        cursor: "pointer",

                        border: isSelected
                          ? "1px solid var(--primary)"
                          : "1px solid transparent",

                        background: isSelected
                          ? "rgba(99,102,241,0.1)"
                          : "var(--muted)",

                        textAlign: "left",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
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
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "42px",
              }}
            >
              🎯
            </p>

            <p
              style={{
                fontSize: "32px",
                fontWeight: 900,
              }}
            >
              {score}/{questions.length}
            </p>

            <p
              style={{
                marginTop: "6px",
                color: "var(--muted-foreground)",
              }}
            >
              Quiz completed
            </p>
          </div>

          {/* XP */}
          <div
            style={{
              background: "rgba(99,102,241,0.1)",
              borderRadius: "14px",
              padding: "18px",
              textAlign: "center",
              border:
                "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted-foreground)",
              }}
            >
              XP EARNED
            </p>

            <p
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "var(--primary)",
              }}
            >
              +{lesson?.xpReward || 25}
            </p>
          </div>

          {/* math CTA */}
          <button
            onClick={() => {
              resetMath();
              setStep("mathcheck");
            }}
            style={primaryBtn}
          >
            📐 Show My Working →
          </button>

          <button
            onClick={() => setStep("input")}
            style={mutedBtn}
          >
            New Topic
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
                  border: `2px dashed ${
                    dragging
                      ? "var(--primary)"
                      : "var(--card-border)"
                  }`,
                  borderRadius: "12px",
                  padding: "3rem 1rem",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                Upload your working
              </div>
            ) : (
              <img
                src={mathPreview}
                alt="working"
                style={{
                  width: "100%",
                  borderRadius: "12px",
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
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <button
                  onClick={analyzeMath}
                  style={primaryBtn}
                >
                  {mathLoading
                    ? "Reading..."
                    : "Analyse My Working"}
                </button>

                <button
                  onClick={resetMath}
                  style={mutedBtn}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {mathError && (
            <div style={cardStyle}>
              {mathError}
            </div>
          )}

          {mathResult && (
            <div style={cardStyle}>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                }}
              >
                {mathResult.score}%
              </p>

              <p
                style={{
                  marginTop: "8px",
                  lineHeight: 1.7,
                }}
              >
                {mathResult.cortexInsight}
              </p>
            </div>
          )}
        </div>
      )}

      {/* recent */}
      {step === "input" &&
        studiedTopics.length > 0 && (
          <div style={cardStyle}>
            <p
              style={{
                fontWeight: 800,
                marginBottom: "12px",
              }}
            >
              Recently Studied
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {studiedTopics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedSubject(
                      t.subject
                    );
                    setTopic(t.topic);
                  }}
                  style={{
                    background:
                      "rgba(99,102,241,0.1)",

                    border:
                      "1px solid rgba(99,102,241,0.2)",

                    borderRadius: "999px",

                    padding: "8px 12px",

                    cursor: "pointer",

                    color: "var(--primary)",
                  }}
                >
                  {t.subject} • {t.topic}
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
