"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Learn() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [explanation, setExplanation] = useState("");
  const [displayedExplanation, setDisplayedExplanation] = useState("");

  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [k: number]: number }>({});

  const [step, setStep] = useState<
    "input" | "thinking" | "explanation" | "quiz" | "results"
  >("input");

  const [loading, setLoading] = useState(false);

  const isLocked = useRef(false);
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
  const askAI = async (payload: any) => {
    const res = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return res.json().catch(() => ({}));
  };

  // ================= STREAM EFFECT (FAKE BUT LIFELIKE) =================
  const streamText = (text: string) => {
    setDisplayedExplanation("");
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setDisplayedExplanation(text.slice(0, i));

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 8); // fast “thinking flow”
  };

  // ================= EXPLANATION =================
  const generateExplanation = async () => {
    if (isLocked.current) return;
    if (!topic || !selectedSubject) return;

    isLocked.current = true;

    setStep("thinking");
    setLoading(true);
    setExplanation("");
    setDisplayedExplanation("");

    const data = await askAI({
      type: "explanation",
      subject: selectedSubject,
      topic,
    });

    const text = data.explanation || "No response generated.";

    setExplanation(text);
    setStep("explanation");

    // 🧠 Cortex Alive effect
    streamText(text);

    setLoading(false);
    isLocked.current = false;
  };

  // ================= QUIZ =================
  const generateQuiz = async () => {
    if (isLocked.current) return;
    isLocked.current = true;

    setStep("thinking");
    setLoading(true);
    setQuestions([]);
    setAnswers({});

    const data = await askAI({
      type: "quiz",
      subject: selectedSubject,
      topic,
    });

    setQuestions(data.questions || []);
    setStep("quiz");

    setLoading(false);
    isLocked.current = false;
  };

  const submitQuiz = () => setStep("results");

  const score = questions.filter(
    (q, i) => answers[i] === q.correct
  ).length;

  // ================= UI =================
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>🧠 Cortex Learn</h1>

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
            placeholder="Enter topic..."
          />

          <button onClick={generateExplanation}>
            Enter Cortex
          </button>
        </>
      )}

      {/* THINKING STATE */}
      {step === "thinking" && (
        <div>
          <p>🧠 Cortex is thinking...</p>
        </div>
      )}

      {/* EXPLANATION (ALIVE TEXT) */}
      {step === "explanation" && (
        <>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {displayedExplanation}
            <span style={{ opacity: 0.5 }}>▍</span>
          </div>

          {!loading && (
            <button onClick={generateQuiz}>
              Test Understanding →
            </button>
          )}
        </>
      )}

      {/* QUIZ */}
      {step === "quiz" && (
        <>
          {questions.map((q, i) => (
            <div key={i}>
              <p>{q.question}</p>

              {q.options?.map((o: string, j: number) => (
                <button
                  key={j}
                  onClick={() =>
                    setAnswers({ ...answers, [i]: j })
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          ))}

          {questions.length > 0 && (
            <button onClick={submitQuiz}>
              Submit
            </button>
          )}
        </>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div>
          <h2>
            Score: {score}/{questions.length}
          </h2>

          <button
            onClick={() => {
              setStep("input");
              setTopic("");
              setExplanation("");
              setDisplayedExplanation("");
              setQuestions([]);
              setAnswers({});
            }}
          >
            New Session
          </button>
        </div>
      )}
    </div>
  );
}
