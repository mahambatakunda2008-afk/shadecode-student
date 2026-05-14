"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import LessonRenderer from "@/components/learn/LessonRenderer";

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

interface LessonBlock {
  type: string;
  content: string;
}

export default function Learn() {
  const supabase = createClient();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");

  const [step, setStep] = useState<
    "input" | "explanation" | "quiz" | "results" | "mathcheck"
  >("input");

  const [explanationBlocks, setExplanationBlocks] = useState<LessonBlock[]>([]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [studiedTopics, setStudiedTopics] = useState<StudyTopic[]>([]);

  const [pageLoading, setPageLoading] = useState(true);

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

  // 🧠 NEW: structured lesson fetch
  const generateExplanation = async () => {
    if (!selectedSubject || !topic.trim()) return;

    setLoading(true);
    setStep("explanation");
    setExplanationBlocks([]);

    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lesson",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });

      const data = await res.json();

      setExplanationBlocks(data.blocks || []);
    } catch (err) {
      console.error(err);
      setExplanationBlocks([
        {
          type: "text",
          content: "Failed to generate lesson. Try again.",
        },
      ]);
    }

    setLoading(false);
  };

  const generateQuiz = async () => {
    setLoading(true);
    setStep("quiz");

    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });

      const data = await res.json();
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

  const score = questions.filter(
    (q, i) => answers[i] === q.correct
  ).length;

  if (pageLoading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* HEADER */}
      <div>
        <h1>Learn</h1>
        <p style={{ opacity: 0.6 }}>AI-powered learning system</p>
      </div>

      {/* STEP 1: INPUT */}
      {step === "input" && (
        <div>
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
            placeholder="Enter topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <button onClick={generateExplanation}>
            Start Learning
          </button>
        </div>
      )}

      {/* STEP 2: EXPLANATION (NOW POWERED BY LESSON ENGINE) */}
      {step === "explanation" && (
        <div>
          <h2>{topic}</h2>

          {loading ? (
            <p>Generating lesson...</p>
          ) : (
            <LessonRenderer blocks={explanationBlocks} />
          )}

          {!loading && explanationBlocks.length > 0 && (
            <button onClick={generateQuiz}>
              Practice Questions →
            </button>
          )}
        </div>
      )}

      {/* STEP 3: QUIZ */}
      {step === "quiz" && (
        <div>
          <h2>Quiz</h2>

          {questions.map((q, i) => (
            <div key={i}>
              <p>{q.question}</p>

              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() =>
                    setAnswers({ ...answers, [i]: oi })
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          ))}

          <button onClick={submitQuiz}>
            Submit
          </button>
        </div>
      )}

      {/* STEP 4: RESULTS */}
      {step === "results" && (
        <div>
          <h2>Score: {score}/{questions.length}</h2>

          <button onClick={() => setStep("input")}>
            New Topic
          </button>
        </div>
      )}

    </div>
  );
}
