"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, Plus, FileText } from "lucide-react";
import type { ExamQuestion, QuestionDifficulty } from "@/lib/exam-hub/types";

interface PaperOption {
  id: string;
  syllabus_id: string;
  level: string;
  session: string;
  year: number;
  paper_number: number;
  variant: number;
  syllabi: { subject: string; board: string } | null;
}

const DIFFICULTIES: QuestionDifficulty[] = ["easy", "medium", "hard"];

export default function QuestionTaggingPage() {
  const [paperSearch, setPaperSearch] = useState("");
  const [papers, setPapers] = useState<PaperOption[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PaperOption | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questionNumber, setQuestionNumber] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "">("");
  const [marks, setMarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchPapers = useCallback((q: string) => {
    fetch(`/api/admin/exam-hub/questions?paperSearch=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => setPapers(data.papers ?? []))
      .catch(() => setPapers([]));
  }, []);

  useEffect(() => {
    searchPapers("");
  }, [searchPapers]);

  const loadQuestions = useCallback((paperId: string) => {
    setLoadingQuestions(true);
    fetch(`/api/admin/exam-hub/questions?paperId=${paperId}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions ?? []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, []);

  function selectPaper(p: PaperOption) {
    setSelectedPaper(p);
    loadQuestions(p.id);
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPaper || !questionNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exam-hub/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_id: selectedPaper.id,
          question_number: questionNumber,
          page_number: pageNumber ? Number(pageNumber) : null,
          topic_id: topicId || null,
          subtopic: subtopic || null,
          difficulty: difficulty || null,
          marks: marks ? Number(marks) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add question");
      setQuestions((prev) => [...prev, data.question].sort((a, b) => a.question_number.localeCompare(b.question_number)));
      setQuestionNumber("");
      setPageNumber("");
      setTopicId("");
      setSubtopic("");
      setDifficulty("");
      setMarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeQuestion(id: string) {
    const prev = questions;
    setQuestions(questions.filter((q) => q.id !== id));
    const res = await fetch(`/api/admin/exam-hub/questions/${id}`, { method: "DELETE" });
    if (!res.ok) setQuestions(prev); // revert on failure
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
          Tag Questions
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          Break a paper into individual questions with topic/difficulty/marks. Powers per-question
          search and weak-topic tracking — entirely optional, papers work fine with zero tagged questions.
        </p>

        {!selectedPaper ? (
          <>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={16} color="var(--muted-foreground)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={paperSearch}
                onChange={(e) => { setPaperSearch(e.target.value); searchPapers(e.target.value); }}
                placeholder="Search by syllabus code (e.g. 9702)"
                style={{ width: "100%", padding: "12px 40px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)", color: "var(--foreground)", fontSize: 14 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {papers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPaper(p)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "left", cursor: "pointer" }}
                >
                  <FileText size={16} color="var(--primary)" />
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                    {p.syllabi?.subject ?? p.syllabus_id} ({p.syllabi?.board}) — {p.level}, {p.session} {p.year}, Paper {p.paper_number}/{p.variant}
                  </span>
                </button>
              ))}
              {papers.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No question papers found.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedPaper(null)}
              style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
            >
              ← Choose a different paper
            </button>

            <div style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)", marginBottom: 20, fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>
              {selectedPaper.syllabi?.subject ?? selectedPaper.syllabus_id} — {selectedPaper.level}, {selectedPaper.session} {selectedPaper.year}, Paper {selectedPaper.paper_number}/{selectedPaper.variant}
            </div>

            {error && (
              <div style={{ padding: 14, borderRadius: 12, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 16 }}>
                <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
              </div>
            )}

            <form onSubmit={addQuestion} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, alignItems: "flex-end" }}>
              <Field label="Q#" width={60}>
                <input value={questionNumber} onChange={(e) => setQuestionNumber(e.target.value)} placeholder="1" style={inputStyle} required />
              </Field>
              <Field label="Page" width={70}>
                <input type="number" value={pageNumber} onChange={(e) => setPageNumber(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Topic" width={140}>
                <input value={topicId} onChange={(e) => setTopicId(e.target.value)} placeholder="Mechanics" style={inputStyle} />
              </Field>
              <Field label="Subtopic" width={140}>
                <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} placeholder="Momentum" style={inputStyle} />
              </Field>
              <Field label="Difficulty" width={110}>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | "")} style={inputStyle}>
                  <option value="">—</option>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Marks" width={70}>
                <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} style={inputStyle} />
              </Field>
              <button
                type="submit"
                disabled={submitting}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 13, fontWeight: 600, cursor: submitting ? "default" : "pointer", height: 38 }}
              >
                <Plus size={14} /> Add
              </button>
            </form>

            {loadingQuestions ? (
              <div style={{ height: 100, borderRadius: 14, background: "var(--surface-2)" }} />
            ) : questions.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No questions tagged yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {questions.map((q) => (
                  <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--card-border)" }}>
                    <div style={{ fontSize: 13, color: "var(--foreground)" }}>
                      <strong>Q{q.question_number}</strong>
                      {q.topic_id && <span style={{ color: "var(--muted-foreground)" }}> · {q.topic_id}</span>}
                      {q.subtopic && <span style={{ color: "var(--muted-foreground)" }}> / {q.subtopic}</span>}
                      {q.difficulty && <span style={{ color: "var(--warning)" }}> · {q.difficulty}</span>}
                      {q.marks && <span style={{ color: "var(--muted-foreground)" }}> · {q.marks} marks</span>}
                    </div>
                    <button onClick={() => removeQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                      <Trash2 size={14} color="var(--danger)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, width, children }: { label: string; width: number; children: React.ReactNode }) {
  return (
    <div style={{ width }}>
      <label style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--surface)",
  border: "1px solid var(--card-border)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box", height: 38,
};
