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
  const [step, setStep] = useState<
    "input" | "explanation" | "quiz" | "results" | "mathcheck"
  >("input");

  const [mathQuestion, setMathQuestion] = useState("");
  const [mathImage, setMathImage] = useState<File | null>(null);
  const [mathPreview, setMathPreview] = useState<string | null>(null);
  const [mathResult, setMathResult] = useState<MathResult | null>(null);
  const [mathLoading, setMathLoading] = useState(false);
  const [mathError, setMathError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ================= LOAD USER =================
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);

      const [{ data: subjectsData }, { data: topicsData }] = await Promise.all([
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

  // ================= EXPLANATION =================
  const generateExplanation = async () => {
    setLoading(true);
    setStep("explanation");

    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "explanation",
        subject: selectedSubject,
        topic,
      }),
    });

    const data = await res.json();
    setExplanation(data.explanation || "No explanation returned.");
    setLoading(false);
  };

  // ================= QUIZ =================
  const generateQuiz = async () => {
    setLoading(true);
    setStep("quiz");

    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quiz",
        subject: selectedSubject,
        topic,
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

  const score = questions.filter((q, i) => answers[i] === q.correct).length;

  // ================= UI =================
  if (pageLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Learn</h1>

      {step === "input" && (
        <>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
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
            placeholder="Topic"
          />

          <button onClick={generateExplanation}>
            Explain
          </button>
        </>
      )}

      {step === "explanation" && (
        <>
          <p>{loading ? "Loading..." : explanation}</p>
          <button onClick={generateQuiz}>Generate Quiz</button>
        </>
      )}

      {step === "quiz" && (
        <>
          {questions.map((q, i) => (
            <div key={i}>
              <p>{q.question}</p>
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  onClick={() =>
                    setAnswers({ ...answers, [i]: j })
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          ))}

          <button onClick={submitQuiz}>Submit</button>
        </>
      )}

      {step === "results" && (
        <>
          <h2>
            Score: {score}/{questions.length}
          </h2>

          <button onClick={() => setStep("input")}>
            New Topic
          </button>
        </>
      )}
    </div>
  );
}
