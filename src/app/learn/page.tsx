"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ---------------- TYPES ---------------- */

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

/* ---------------- COMPONENT ---------------- */

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

  /* ---------------- INIT ---------------- */

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
          supabase.from("subjects").select("*").eq("user_id", user.id),
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

  /* ---------------- API CALLS ---------------- */

  const generateLesson = async () => {
    setLoading(true);
    setStep("lesson");

    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "lesson",
        subject: selectedSubject,
        topic: topic.trim(),
        mode: learningMode,
      }),
    });

    const data = await res.json();
    setLesson(data);
    setLoading(false);
  };

  const generateQuiz = async () => {
    setLoading(true);
    setStep("quiz");

    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quiz",
        subject: selectedSubject,
        topic: topic.trim(),
        mode: learningMode,
      }),
    });

    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  };

  const submitQuiz = () => {
    setSubmitted(true);
    setStep("results");
  };

  /* ---------------- UI ---------------- */

  if (pageLoading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "40px 20px" }}>
      {/* HEADER */}
      <h1>AI Learn</h1>

      {/* INPUT */}
      {step === "input" && (
        <div style={cardStyle}>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic"
            style={inputStyle}
          />

          <button onClick={generateLesson} style={primaryBtn}>
            Generate Lesson
          </button>
        </div>
      )}

      {/* LESSON */}
      {step === "lesson" && (
        <div>
          {loading && <p>Generating lesson...</p>}

          {!loading &&
            lesson?.blocks.map((b, i) => (
              <div key={i} style={cardStyle}>
                <h3>{b.title}</h3>
                <p>{b.content}</p>

                {/* SAFE math fallback */}
                {b.formula && (
                  <code
                    style={{
                      display: "block",
                      marginTop: 10,
                      background: "#111",
                      color: "#0f0",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    {b.formula}
                  </code>
                )}
              </div>
            ))}

          <button onClick={generateQuiz} style={primaryBtn}>
            Take Quiz
          </button>
        </div>
      )}

      {/* QUIZ */}
      {step === "quiz" && (
        <div>
          {questions.map((q, i) => (
            <div key={i} style={cardStyle}>
              <p>{q.question}</p>

              {q.options.map((o, oi) => (
                <button
                  key={oi}
                  onClick={() =>
                    setAnswers({ ...answers, [i]: oi })
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          ))}

          <button onClick={submitQuiz} style={primaryBtn}>
            Submit
          </button>
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div style={cardStyle}>
          <h2>
            Score: {score}/{questions.length}
          </h2>

          <button
            onClick={() => setStep("input")}
            style={primaryBtn}
          >
            New Topic
          </button>
        </div>
      )}
    </div>
  );
}
