"use client";

import { useEffect, useState } from "react";
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
  const [step, setStep] = useState<"input" | "explanation" | "quiz" | "results">("input");
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
        body: JSON.stringify({
          type: "explanation",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });

      const data = await response.json();
      setExplanation(data.explanation || "Could not generate explanation.");

      // Save topic
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

  if (pageLoading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
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
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
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
            <button
              onClick={generateExplanation}
              disabled={!selectedSubject || !topic.trim()}
              style={{ ...primaryBtn, opacity: !selectedSubject || !topic.trim() ? 0.5 : 1 }}
            >
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
                <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {selectedSubject}
                </p>
                <p style={{ fontWeight: 800, fontSize: "18px", marginTop: "2px" }}>{topic}</p>
              </div>
              <button
                onClick={() => { setStep("input"); setExplanation(""); }}
                style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "13px" }}
              >
                ← Back
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--muted-foreground)" }}>
                <p style={{ fontSize: "24px", marginBottom: "8px" }}>🧠</p>
                <p style={{ fontSize: "14px" }}>Generating explanation...</p>
              </div>
            ) : (
              <p style={{ fontSize: "14px", lineHeight: 1.8, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {explanation}
              </p>
            )}
          </div>

          {!loading && explanation && (
            <button onClick={generateQuiz} style={{ ...primaryBtn, width: "100%" }}>
              Practice Questions →
            </button>
          )}
        </div>
      )}

      {/* Quiz */}
      {step === "quiz" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Practice: {topic}</h2>
            <button
              onClick={() => setStep("explanation")}
              style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "13px" }}
            >
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
                  <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", lineHeight: 1.5 }}>
                    {qi + 1}. {q.question}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {q.options.map((option, oi) => {
                      const isSelected = answers[qi] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                          style={{
                            background: isSelected ? "rgba(99,102,241,0.15)" : "var(--muted)",
                            border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            color: isSelected ? "var(--primary)" : "var(--foreground)",
                            textAlign: "left",
                            cursor: submitted ? "default" : "pointer",
                            fontSize: "14px",
                            fontWeight: isSelected ? 600 : 400,
                            transition: "all 0.2s",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {questions.length > 0 && !submitted && (
                <button
                  onClick={submitQuiz}
                  disabled={Object.keys(answers).length < questions.length}
                  style={{
                    ...primaryBtn,
                    width: "100%",
                    opacity: Object.keys(answers).length < questions.length ? 0.5 : 1,
                  }}
                >
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
            ...cardStyle,
            textAlign: "center",
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
              <div key={qi} style={{
                ...cardStyle,
                border: `1px solid ${isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
                  {qi + 1}. {q.question}
                </p>
                <p style={{ fontSize: "13px", color: isCorrect ? "var(--success)" : "#ef4444", marginBottom: "4px" }}>
                  {isCorrect ? "✓ Correct" : `✗ Your answer: ${q.options[userAnswer]}`}
                </p>
                {!isCorrect && (
                  <p style={{ fontSize: "13px", color: "var(--success)" }}>
                    Correct: {q.options[q.correct]}
                  </p>
                )}
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px", lineHeight: 1.5 }}>
                  {q.explanation}
                </p>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => { setStep("explanation"); setSubmitted(false); setAnswers({}); }}
              style={{ ...primaryBtn, flex: 1, background: "var(--muted)", boxShadow: "none" }}
            >
              Review Topic
            </button>
            <button
              onClick={() => { setStep("input"); setExplanation(""); setQuestions([]); setAnswers({}); setSubmitted(false); setTopic(""); }}
              style={{ ...primaryBtn, flex: 1 }}
            >
              New Topic
            </button>
          </div>
        </div>
      )}

      {/* Recent Topics */}
      {step === "input" && studiedTopics.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>Recently Studied</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {studiedTopics.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedSubject(t.subject); setTopic(t.topic); }}
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "99px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {t.subject} — {t.topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}