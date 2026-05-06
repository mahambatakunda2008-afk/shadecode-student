"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Learn() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [step, setStep] = useState<"input" | "explanation" | "quiz" | "results">("input");
  const [loading, setLoading] = useState(false);

  // 🧠 NEW: prevents double calls / race conditions
  const isGeneratingRef = useRef(false);

  const router = useRouter();
  const supabase = createClient();

  // ================= LOAD =================
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");

      const { data } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id);

      setSubjects(data || []);
    };

    init();
  }, []);

  // ================= SAFE FETCH =================
  const safeFetch = async (payload: any) => {
    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return data;
  };

  // ================= EXPLANATION =================
  const generateExplanation = async () => {
    if (isGeneratingRef.current) return;
    if (!selectedSubject || !topic) return;

    isGeneratingRef.current = true;
    setLoading(true);
    setStep("explanation");
    setExplanation("");

    try {
      const data = await safeFetch({
        type: "explanation",
        subject: selectedSubject,
        topic,
      });

      setExplanation(data.explanation || "No explanation returned.");
    } catch {
      setExplanation("Failed to generate explanation.");
    }

    setLoading(false);
    isGeneratingRef.current = false;
  };

  // ================= QUIZ =================
  const generateQuiz = async () => {
    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setLoading(true);
    setStep("quiz");
    setQuestions([]);
    setAnswers({});

    try {
      const data = await safeFetch({
        type: "quiz",
        subject: selectedSubject,
        topic,
      });

      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    }

    setLoading(false);
    isGeneratingRef.current = false;
  };

  const submitQuiz = () => {
    setStep("results");
  };

  const score = questions.filter((q, i) => answers[i] === q.correct).length;

  // ================= UI =================
  return (
    <div style={{ padding: 24 }}>
      <h1>Learn</h1>

      {/* INPUT */}
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

          <button
            onClick={generateExplanation}
            disabled={loading}
          >
            {loading ? "Thinking..." : "Explain"}
          </button>
        </>
      )}

      {/* EXPLANATION */}
      {step === "explanation" && (
        <>
          <p>{loading ? "Generating..." : explanation}</p>

          {!loading && (
            <button onClick={generateQuiz}>
              Generate Quiz
            </button>
          )}
        </>
      )}

      {/* QUIZ */}
      {step === "quiz" && (
        <>
          {loading && <p>Creating questions...</p>}

          {questions.map((q, i) => (
            <div key={i}>
              <p>{q.question}</p>

              {q.options?.map((opt: string, j: number) => (
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

          {!loading && questions.length > 0 && (
            <button onClick={submitQuiz}>
              Submit
            </button>
          )}
        </>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <>
          <h2>
            Score: {score}/{questions.length}
          </h2>

          <button
            onClick={() => {
              setStep("input");
              setTopic("");
              setQuestions([]);
              setAnswers({});
              setExplanation("");
            }}
          >
            New Topic
          </button>
        </>
      )}
    </div>
  );
}
