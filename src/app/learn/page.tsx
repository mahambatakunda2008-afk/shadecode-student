"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

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

interface LessonBlock {
  type: "intro" | "concept" | "example" | "tip" | "warning" | "summary";

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

/* ---------------- PAGE ---------------- */

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
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [reflection, setReflection] = useState("");

  const [step, setStep] = useState<
    "input" | "lesson" | "quiz" | "results" | "math"
  >("input");

  /* ---------------- MATH CHECKER ---------------- */

  const [mathImage, setMathImage] = useState<File | null>(null);
  const [mathPreview, setMathPreview] = useState<string | null>(null);
  const [mathResult, setMathResult] = useState<MathResult | null>(null);
  const [mathLoading, setMathLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

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

      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase
          .from("study_topics")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setSubjects(s || []);
      setStudiedTopics(t || []);
      setPageLoading(false);
    };

    init();
  }, []);

  /* ---------------- LESSON ---------------- */

  const generateLesson = async () => {
    setLoading(true);
    setStep("lesson");
    setLesson(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

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
    setLesson(data);
    setLoading(false);

    if (userId) {
      await supabase.from("study_topics").insert({
        user_id: userId,
        subject: selectedSubject,
        topic: topic.trim(),
      });
    }
  };

  /* ---------------- QUIZ ---------------- */

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

  const score = questions.filter(
    (q, i) => answers[i] === q.correct
  ).length;

  /* ---------------- MATH ---------------- */

  const handleMath = async () => {
    if (!mathImage) return;

    setMathLoading(true);

    const form = new FormData();
    form.append("image", mathImage);
    form.append("topic", topic);
    form.append("subject", selectedSubject);

    const res = await fetch("/api/math-checker", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    setMathResult(data);
    setMathLoading(false);
  };

  const onFile = (file: File) => {
    setMathImage(file);
    setMathPreview(URL.createObjectURL(file));
  };

  /* ---------------- UI ---------------- */

  if (pageLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>

      {/* INPUT */}
      {step === "input" && (
        <div>
          <h1>Learn</h1>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic"
          />

          <button onClick={generateLesson}>
            Start Learning
          </button>
        </div>
      )}

      {/* LESSON */}
      {step === "lesson" && lesson && (
        <div>
          {lesson.blocks.map((b, i) => (
            <div key={i}>
              {b.title && <h3>{b.title}</h3>}
              <p>{b.content}</p>

              {b.formula && (
                <BlockMath math={b.formula} />
              )}

              {b.example && (
                <div>
                  <p>{b.example.question}</p>
                  <p>{b.example.answer}</p>
                </div>
              )}
            </div>
          ))}

          <textarea
            value={reflection}
            onChange={(e) =>
              setReflection(e.target.value)
            }
            placeholder="Explain in your own words"
          />

          <button onClick={generateQuiz}>
            Continue to Quiz
          </button>
        </div>
      )}

      {/* QUIZ */}
      {step === "quiz" && (
        <div>
          {questions.map((q, i) => (
            <div key={i}>
              <p>{q.question}</p>

              {q.options.map((o, oi) => (
                <button
                  key={oi}
                  onClick={() =>
                    setAnswers({
                      ...answers,
                      [i]: oi,
                    })
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          ))}

          <button onClick={submitQuiz}>
            Submit
          </button>
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div>
          <h2>
            Score: {score}/{questions.length}
          </h2>

          <button onClick={() => setStep("math")}>
            Show Working
          </button>
        </div>
      )}

      {/* MATH */}
      {step === "math" && (
        <div>
          <input
            type="file"
            onChange={(e) =>
              e.target.files &&
              onFile(e.target.files[0])
            }
          />

          {mathPreview && (
            <img
              src={mathPreview}
              width={300}
            />
          )}

          <button onClick={handleMath}>
            Analyse
          </button>

          {mathResult && (
            <pre>
              {JSON.stringify(mathResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
