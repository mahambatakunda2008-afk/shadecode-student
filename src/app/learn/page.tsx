"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  steps: { description: string; status: string; note?: string }[];
}

export default function Learn() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [studiedTopics, setStudiedTopics] = useState<StudyTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "explanation" | "quiz" | "results" | "mathcheck">("input");

  // Math checker state
  const [mathImage, setMathImage] = useState<File | null>(null);
  const [mathPreview, setMathPreview] = useState<string | null>(null);
  const [mathResult, setMathResult] = useState<MathResult | null>(null);
  const [mathLoading, setMathLoading] = useState(false);
  const [mathError, setMathError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const [{ data: subjectsData }, { data: topicsData }] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("study_topics").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setSubjects(subjectsData || []);
      setStudiedTopics(topicsData || []);
      setPageLoading(false);
    };
    init();
  }, []);

  const generateExplanation = async () => {
    if (!selectedSubject || !topic.trim()) return;
    setLoading(true);
    setStep("explanation");
    setExplanation("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "explanation", subject: selectedSubject, topic: topic.trim() }),
      });
      const data = await response.json();
      setExplanation(data.explanation || "Could not generate explanation.");

      if (userId) {
        const { data: saved } = await supabase
          .from("study_topics")
          .insert({ user_id: userId, subject: selectedSubject, topic: topic.trim() })
          .select()
          .single();
        if (saved) setStudiedTopics(prev => [saved, ...prev].slice(0, 10));
      }
    } catch {
      setExplanation("Failed to generate explanation. Please try again.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quiz", subject: selectedSubject, topic: topic.trim() }),
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

  // Math checker handlers
  const handleMathFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setMathImage(file);
    setMathResult(null);
    setMathError(null);
    const reader = new FileReader();
    reader.onload = (e) => setMathPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleMathFile(e.dataTransfer.files[0]);
  }, []);

  const analyzeMath = async () => {
    if (!mathImage) return;
    setMathLoading(true);
    setMathError(null);
    setMathResult(null);

    try {
      const formData = new FormData();
      formData.append("image", mathImage);
      formData.append("topic", topic);
      formData.append("subject", selectedSubject);

      const res = await fetch("/api/math-checker", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setMathResult(data);
    } catch {
      setMathError("Could not analyse the image. Please try again.");
    } finally {
      setMathLoading(false);
    }
  };

  const resetMath = () => {
    setMathImage(null);
    setMathPreview(null);
    setMathResult(null);
    setMathError(null);
  };

  const score = questions.filter((q, i) => answers[i] === q.correct).length;

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
    boxShadow: "0 0 16px var(--primary-glow)",
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

  if (pageLoading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
  );

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Learn</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          AI-powered topic explanations and practice
        </p>
      </div>

      {/* Input */}
      {step === "input" && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>What do you want to study?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Subject</p>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Topic</p>
              <input
                placeholder="e.g. Differentiation, Newton's Laws, Photosynthesis"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateExplanation()}
                style={inputStyle}
              />
            </div>
            <button onClick={generateExplanation} disabled={!selectedSubject || !topic.trim()} style={{ ...primaryBtn, opacity: !selectedSubject || !topic.trim() ? 0.5 : 1 }}>
              Explain This Topic →
            </button>
          </div>
        </div>
      )}

      {/* Explanation */}
      {step === "explanation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div>
                <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>{selectedSubject}</p>
                <p style={{ fontWeight: 800, fontSize: "18px", marginTop: "2px" }}>{topic}</p>
              </div>
              <button onClick={() => { setStep("input"); setExplanation(""); }} style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "13px" }}>
                ← Back
              </button>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--muted-foreground)" }}>
                <p style={{ fontSize: "24px", marginBottom: "8px" }}>🧠</p>
                <p style={{ fontSize: "14px" }}>Generating explanation...</p>
              </div>
            ) : (
              <p style={{ fontSize: "14px", lineHeight: 1.8, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{explanation}</p>
            )}
          </div>
          {!loading && explanation && (
            <button onClick={generateQuiz} style={{ ...primaryBtn, width: "100%" }}>Practice Questions →</button>
          )}
        </div>
      )}

      {/* Quiz */}
      {step === "quiz" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Practice: {topic}</h2>
            <button onClick={() => setStep("explanation")} style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "13px" }}>
              ← Back
            </button>
          </div>

          {loading ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: "32px" }}>
              <p style={{ fontSize: "24px", marginBottom: "8px" }}>⚡</p>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Generating questions...</p>
            </div>
          ) : (
            <>
              {questions.map((q, qi) => (
                <div key={qi} style={cardStyle}>
                  <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", lineHeight: 1.5 }}>{qi + 1}. {q.question}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {q.options.map((option, oi) => {
                      const isSelected = answers[qi] === oi;
                      return (
                        <button key={oi} onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })} style={{
                          background: isSelected ? "rgba(99,102,241,0.15)" : "var(--muted)",
                          border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                          borderRadius: "8px", padding: "10px 14px",
                          color: isSelected ? "var(--primary)" : "var(--foreground)",
                          textAlign: "left", cursor: submitted ? "default" : "pointer",
                          fontSize: "14px", fontWeight: isSelected ? 600 : 400, transition: "all 0.2s",
                        }}>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {questions.length > 0 && !submitted && (
                <button onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length} style={{ ...primaryBtn, width: "100%", opacity: Object.keys(answers).length < questions.length ? 0.5 : 1 }}>
                  Submit Answers
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Results */}
      {step === "results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{
            ...cardStyle, textAlign: "center",
            background: score === questions.length ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
            border: `1px solid ${score === questions.length ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"}`,
          }}>
            <p style={{ fontSize: "40px", marginBottom: "8px" }}>
              {score === questions.length ? "🎯" : score >= questions.length / 2 ? "👍" : "📚"}
            </p>
            <p style={{ fontSize: "28px", fontWeight: 800, color: score === questions.length ? "var(--success)" : "var(--primary)" }}>
              {score}/{questions.length}
            </p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
              {score === questions.length ? "Perfect score!" : score >= questions.length / 2 ? "Good effort." : "Keep studying."}
            </p>
          </div>

          {questions.map((q, qi) => {
            const userAnswer = answers[qi];
            const isCorrect = userAnswer === q.correct;
            return (
              <div key={qi} style={{ ...cardStyle, border: `1px solid ${isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>{qi + 1}. {q.question}</p>
                <p style={{ fontSize: "13px", color: isCorrect ? "var(--success)" : "#ef4444", marginBottom: "4px" }}>
                  {isCorrect ? "✓ Correct" : `✗ Your answer: ${q.options[userAnswer]}`}
                </p>
                {!isCorrect && <p style={{ fontSize: "13px", color: "var(--success)" }}>Correct: {q.options[q.correct]}</p>}
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px", lineHeight: 1.5 }}>{q.explanation}</p>
              </div>
            );
          })}

          {/* Math Checker CTA */}
          <div style={{
            ...cardStyle,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.25)",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "20px", marginBottom: "6px" }}>📐</p>
            <p style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>Can you show your working?</p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "12px", lineHeight: 1.5 }}>
              Multiple choice tests recall. Cortex tests understanding.<br />
              Solve a problem on paper and upload your working.
            </p>
            <button onClick={() => { resetMath(); setStep("mathcheck"); }} style={{ ...primaryBtn, width: "100%" }}>
              Show My Working →
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setStep("explanation"); setSubmitted(false); setAnswers({}); }} style={{ ...mutedBtn, flex: 1 }}>
              Review Topic
            </button>
            <button onClick={() => { setStep("input"); setExplanation(""); setQuestions([]); setAnswers({}); setSubmitted(false); setTopic(""); }} style={{ ...primaryBtn, flex: 1 }}>
              New Topic
            </button>
          </div>
        </div>
      )}

      {/* Math Checker */}
      {step === "mathcheck" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
                {selectedSubject} — {topic}
              </p>
              <h2 style={{ fontSize: "18px", fontWeight: 800, marginTop: "2px" }}>Show Your Working</h2>
            </div>
            <button onClick={() => setStep("results")} style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "13px" }}>
              ← Back
            </button>
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "12px", lineHeight: 1.6 }}>
              Solve a <strong style={{ color: "var(--foreground)" }}>{topic}</strong> problem on paper. Take a photo of your full working — not just the answer — and Cortex will read every step.
            </p>

            {/* Upload zone */}
            {!mathPreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? "var(--primary)" : "var(--card-border)"}`,
                  borderRadius: "10px",
                  padding: "2.5rem 1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragging ? "rgba(99,102,241,0.05)" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📐</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Drop your photo here or click to upload</p>
              </div>
            ) : (
              <img src={mathPreview} alt="Working" style={{ width: "100%", borderRadius: "8px", maxHeight: "280px", objectFit: "contain", background: "var(--muted)" }} />
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleMathFile(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleMathFile(e.target.files[0])} />

            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {mathPreview && (
                <>
                  <button onClick={analyzeMath} disabled={mathLoading} style={{ ...primaryBtn, width: "100%", opacity: mathLoading ? 0.6 : 1 }}>
                    {mathLoading ? "🧠 Cortex is reading..." : "🧠 Analyse My Working"}
                  </button>
                  <button onClick={resetMath} style={{ ...mutedBtn, width: "100%" }}>Clear & try again</button>
                </>
              )}
              <button onClick={() => cameraInputRef.current?.click()} style={{ ...mutedBtn, width: "100%", fontSize: "13px" }}>
                📷 Use Camera
              </button>
            </div>
          </div>

          {/* Math Result */}
          {mathError && (
            <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.3)" }}>
              <p style={{ color: "#ef4444", fontSize: "13px" }}>{mathError}</p>
            </div>
          )}

          {mathResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Score + Cortex insight */}
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem", fontWeight: 700,
                    background: mathResult.score >= 80 ? "rgba(34,197,94,0.15)" : mathResult.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                    color: mathResult.score >= 80 ? "#22c55e" : mathResult.score >= 50 ? "#f59e0b" : "#ef4444",
                    border: `2px solid ${mathResult.score >= 80 ? "rgba(34,197,94,0.3)" : mathResult.score >= 50 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}>
                    {mathResult.score}%
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{mathResult.problem}</p>
                    <span style={{
                      fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                      background: mathResult.correct ? "rgba(34,197,94,0.15)" : mathResult.score > 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: mathResult.correct ? "#22c55e" : mathResult.score > 40 ? "#f59e0b" : "#ef4444",
                    }}>
                      {mathResult.correct ? "Correct" : mathResult.score > 40 ? "Partially correct" : "Needs work"}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "11px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>CORTEX</p>
                <p style={{
                  fontSize: "13px", lineHeight: 1.7, color: "var(--muted-foreground)",
                  background: "rgba(99,102,241,0.06)", borderRadius: "8px", padding: "10px 12px",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}>
                  {mathResult.cortexInsight}
                </p>
              </div>

              {/* Steps */}
              {mathResult.steps?.length > 0 && (
                <div style={cardStyle}>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "10px" }}>Step Analysis</p>
                  {mathResult.steps.map((step, i) => (
                    <div key={i} style={{
                      background: "var(--muted)", borderRadius: "8px", padding: "10px 12px",
                      marginBottom: "6px", fontFamily: "monospace", fontSize: "13px",
                      borderLeft: `3px solid ${step.status === "correct" ? "#22c55e" : step.status === "incorrect" ? "#ef4444" : "#f59e0b"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>Step {i + 1}</span>
                        <span style={{
                          fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "20px",
                          background: step.status === "correct" ? "rgba(34,197,94,0.15)" : step.status === "incorrect" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                          color: step.status === "correct" ? "#22c55e" : step.status === "incorrect" ? "#ef4444" : "#f59e0b",
                        }}>
                          {step.status}
                        </span>
                      </div>
                      <p style={{ color: "var(--foreground)", margin: 0 }}>{step.description}</p>
                      {step.note && <p style={{ color: "var(--muted-foreground)", fontSize: "12px", margin: "4px 0 0" }}>{step.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => { setStep("input"); setExplanation(""); setQuestions([]); setAnswers({}); setSubmitted(false); setTopic(""); resetMath(); }} style={{ ...primaryBtn, width: "100%" }}>
                Study a New Topic
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Topics */}
      {step === "input" && studiedTopics.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>Recently Studied</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {studiedTopics.map(t => (
              <button key={t.id} onClick={() => { setSelectedSubject(t.subject); setTopic(t.topic); }} style={{
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "99px", padding: "6px 12px", fontSize: "12px",
                color: "var(--primary)", cursor: "pointer", fontWeight: 500,
              }}>
                {t.subject} — {t.topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
