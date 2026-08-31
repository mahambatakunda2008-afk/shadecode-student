"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Question {
  id: string;
  question_number: string;
  question_text: string;
  marks: number | null;
  difficulty: string | null;
  subtopic: string | null;
  past_papers?: {
    id: string;
    syllabus_id: string;
    level: string | null;
    session: string;
    year: number;
    paper_number: number | null;
    variant: number | null;
  } | null;
}

interface CortexResult {
  concept?: string;
  hint?: string;
  method?: string[];
  solution?: string;
  finalAnswer?: string;
  examTip?: string;
}

export default function QuestionBankPage() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cortexQuestion, setCortexQuestion] = useState<string | null>(null);
  const [cortexResult, setCortexResult] = useState<CortexResult | null>(null);
  const [cortexLoading, setCortexLoading] = useState(false);
  const [cortexError, setCortexError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (searchText: string, selectedDifficulty: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (searchText.trim()) params.set("q", searchText.trim());
      if (selectedDifficulty) params.set("difficulty", selectedDifficulty);
      const response = await fetch(`/api/exam-hub/questions?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load questions");
      setQuestions(payload.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const askCortex = async (question: Question) => {
    setCortexQuestion(question.id);
    setCortexResult(null);
    setCortexError(null);
    setCortexLoading(true);
    try {
      const response = await fetch("/api/exam-hub/cortex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: "question-help",
          subject: question.past_papers?.syllabus_id ?? "General",
          question: question.question_text,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Cortex could not answer right now");
      setCortexResult(payload);
    } catch (err) {
      setCortexError(err instanceof Error ? err.message : "Cortex could not answer right now");
    } finally {
      setCortexLoading(false);
    }
  };

  const load = (event?: FormEvent) => {
    event?.preventDefault();
    void fetchQuestions(query, difficulty);
  };

  useEffect(() => {
    void fetchQuestions("", "");
  }, [fetchQuestions]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/exam-hub" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← Exam Hub
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[var(--foreground)]">Question Bank</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Search extracted questions from the paper library, then ask Cortex for evidence-grounded help.
        </p>
      </div>

      <form onSubmit={load} className="mb-6 grid gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 sm:grid-cols-[1fr_180px_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={200}
          placeholder="Search question text..."
          className="min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
        >
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button type="submit" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">{error}</div>}

      {!loading && !error && questions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-10 text-center">
          <p className="font-medium text-[var(--foreground)]">No questions found yet.</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">The question bank is populated from verified past-paper ingestion.</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question) => {
          const isOpen = cortexQuestion === question.id;
          return (
            <article key={question.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>Question {question.question_number}</span>
                {question.marks !== null && <span>• {question.marks} marks</span>}
                {question.difficulty && <span>• {question.difficulty}</span>}
                {question.subtopic && <span>• {question.subtopic}</span>}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{question.question_text}</p>
              {question.past_papers && (
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  {question.past_papers.syllabus_id} · {question.past_papers.level ?? "Level unspecified"} · {question.past_papers.session} {question.past_papers.year}
                </p>
              )}
              <button
                type="button"
                onClick={() => (isOpen ? setCortexQuestion(null) : void askCortex(question))}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)]"
              >
                <Sparkles size={16} />
                {isOpen ? "Close Cortex" : "Ask Cortex"}
              </button>

              {isOpen && (
                <div className="mt-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--surface)] p-4">
                  {cortexLoading && <p className="text-sm text-[var(--muted-foreground)]">Cortex is reading the question…</p>}
                  {cortexError && <p className="text-sm text-red-600">{cortexError}</p>}
                  {cortexResult && (
                    <div className="space-y-4 text-sm text-[var(--foreground)]">
                      {cortexResult.concept && <div><p className="font-semibold">Key concept</p><p className="mt-1 text-[var(--muted-foreground)]">{cortexResult.concept}</p></div>}
                      {cortexResult.hint && <div><p className="font-semibold">Hint</p><p className="mt-1 leading-6">{cortexResult.hint}</p></div>}
                      {cortexResult.method?.length ? <div><p className="font-semibold">Method</p><ol className="mt-1 list-decimal space-y-1 pl-5">{cortexResult.method.map((step, index) => <li key={`${question.id}-step-${index}`}>{step}</li>)}</ol></div> : null}
                      {cortexResult.solution && <div><p className="font-semibold">Worked explanation</p><p className="mt-1 whitespace-pre-wrap leading-6">{cortexResult.solution}</p></div>}
                      {cortexResult.finalAnswer && <div><p className="font-semibold">Final answer</p><p className="mt-1 font-medium">{cortexResult.finalAnswer}</p></div>}
                      {cortexResult.examTip && <div className="rounded-lg border border-[var(--card-border)] p-3"><p className="font-semibold">Exam tip</p><p className="mt-1 text-[var(--muted-foreground)]">{cortexResult.examTip}</p></div>}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
