"use client";

import { useEffect, useState } from "react";

type QuestionMark = { questionNumber: number; marksAwarded: number; maxMarks: number; feedback: string };
type Submission = {
  id: string;
  student_id: string;
  student_name: string;
  response: string;
  submitted_at: string;
  status: "submitted" | "marked";
  score: number | null;
  feedback: string | null;
  marked_at: string | null;
  question_marks: QuestionMark[];
};
type Question = { prompt: string; type: string; marks: number };
type Assignment = { id: string; title: string; subject: string; max_score: number; due_at: string | null; status: string; assessment_type?: string; questions?: Question[]; mark_scheme?: Array<{ criterion: string }> };
type Payload = { assignment: Assignment; group: { name: string } | null; submissions: Submission[] };

function getQuestionResponses(response: string, count: number): string[] {
  const answers = Array.from({ length: count }, () => "");
  const pattern = /(?:^|\\n\\n)Question (\\d+) \\([\\d.]+ marks\\)\\n([\\s\\S]*?)(?=\\n\\nQuestion \\d+ \\([\\d.]+ marks\\)\\n|$)/g;
  for (const match of response.matchAll(pattern)) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < count) answers[index] = match[2].trim();
  }
  if (count === 1 && !answers[0]) answers[0] = response;
  return answers;
}

export function SubmissionInbox({ assignmentId }: { assignmentId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [questionScores, setQuestionScores] = useState<Record<string, Record<number, string>>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, Record<number, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setError("");
    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load submissions.");
      setData(payload);
      setScores((current) => Object.fromEntries(payload.submissions.map((s: Submission) => [s.id, current[s.id] ?? (s.score == null ? "" : String(s.score))])));
      setFeedback((current) => Object.fromEntries(payload.submissions.map((s: Submission) => [s.id, current[s.id] ?? s.feedback ?? ""])));
      setQuestionScores((current) => Object.fromEntries(payload.submissions.map((s: Submission) => [
        s.id,
        current[s.id] ?? Object.fromEntries((s.question_marks ?? []).map((mark) => [mark.questionNumber - 1, String(mark.marksAwarded)])),
      ])));
      setQuestionFeedback((current) => Object.fromEntries(payload.submissions.map((s: Submission) => [
        s.id,
        current[s.id] ?? Object.fromEntries((s.question_marks ?? []).map((mark) => [mark.questionNumber - 1, mark.feedback ?? ""])),
      ])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load submissions.");
    }
  }

  useEffect(() => { void load(); }, [assignmentId]);

  async function mark(submission: Submission) {
    const questions = data?.assignment.questions ?? [];
    const structured = questions.length > 0;
    let body: Record<string, unknown>;
    if (structured) {
      const marks = questionScores[submission.id] ?? {};
      if (questions.some((_, index) => marks[index] == null || marks[index].trim() === "")) {
        setError("Enter marks for every question before saving.");
        return;
      }
      const questionMarks = questions.map((question, index) => {
        const awarded = Number(marks[index]);
        if (!Number.isFinite(awarded) || awarded < 0 || awarded > question.marks) {
          throw new Error(`Question ${index + 1}: enter a mark between 0 and ${question.marks}.`);
        }
        return {
          questionNumber: index + 1,
          marksAwarded: awarded,
          feedback: questionFeedback[submission.id]?.[index] ?? "",
        };
      });
      body = { submissionId: submission.id, questionMarks, feedback: feedback[submission.id] ?? "" };
    } else {
      const score = Number(scores[submission.id]);
      if (!Number.isFinite(score) || score < 0 || score > (data?.assignment.max_score ?? 0)) {
        setError(`Enter a score between 0 and ${data?.assignment.max_score ?? 0}.`);
        return;
      }
      body = { submissionId: submission.id, score, feedback: feedback[submission.id] ?? "" };
    }

    setSaving(submission.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save marking.");
      setNotice(`Feedback saved for ${submission.student_name}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marking.");
    } finally {
      setSaving(null);
    }
  }

  if (!data) return <p role="status" className="text-sm text-[var(--muted-foreground)]">{error || "Loading submission inbox…"}</p>;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{data.group?.name ?? "Class"} · {data.assignment.subject}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.assignment.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{data.submissions.length} submission{data.submissions.length === 1 ? "" : "s"} · Out of {data.assignment.max_score} marks</p>
      </header>

      {data.assignment.questions?.length ? (
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h2 className="font-semibold">Assessment paper and mark scheme</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{data.assignment.assessment_type ?? "assignment"} · {data.assignment.questions.length} questions</p>
          <div className="mt-4 space-y-3">
            {data.assignment.questions.map((question, index) => (
              <article key={index} className="rounded-xl bg-[var(--surface)] p-3">
                <div className="flex justify-between gap-3 text-sm font-medium"><span>Question {index + 1}</span><span>{question.marks} marks</span></div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{question.prompt}</p>
              </article>
            ))}
          </div>
          {data.assignment.mark_scheme?.length ? <details className="mt-4 rounded-xl border border-[var(--card-border)] p-3">
            <summary className="cursor-pointer text-sm font-medium">Teacher-only marking criteria</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{data.assignment.mark_scheme.map((item, index) => <li key={index}>{item.criterion}</li>)}</ol>
          </details> : <p className="mt-3 text-xs text-[var(--muted-foreground)]">No marking criteria added.</p>}
        </section>
      ) : null}

      {data.submissions.length ? data.submissions.map((submission) => {
        const questions = data.assignment.questions ?? [];
        const answers = getQuestionResponses(submission.response, questions.length);
        return (
          <article key={submission.id} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{submission.student_name}</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">{submission.status === "marked" ? "Marked" : "Awaiting marking"}</span>
            </div>

            {questions.length ? (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <section key={index} className="space-y-3 rounded-xl bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold">Question {index + 1}</h3>
                      <span className="text-xs text-[var(--muted-foreground)]">Out of {question.marks}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{question.prompt}</p>
                    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Learner response</p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{answers[index] || "No response recorded."}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium">Marks awarded</span>
                        <input type="number" min="0" max={question.marks} step="0.5" value={questionScores[submission.id]?.[index] ?? ""} onChange={(event) => setQuestionScores((current) => ({ ...current, [submission.id]: { ...(current[submission.id] ?? {}), [index]: event.target.value } }))} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5" />
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium">Question feedback / method marks</span>
                        <textarea rows={2} maxLength={2000} value={questionFeedback[submission.id]?.[index] ?? ""} onChange={(event) => setQuestionFeedback((current) => ({ ...current, [submission.id]: { ...(current[submission.id] ?? {}), [index]: event.target.value } }))} placeholder="Award method marks, identify errors and explain the next step…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5" />
                      </label>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--surface)] p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Learner response</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{submission.response || "No written response provided."}</p>
                <label className="mt-3 block space-y-1.5 text-sm">
                  <span className="font-medium">Score / {data.assignment.max_score}</span>
                  <input type="number" min="0" max={data.assignment.max_score} step="0.5" value={scores[submission.id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [submission.id]: event.target.value }))} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5" />
                </label>
              </div>
            )}

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Overall feedback</span>
              <textarea rows={2} maxLength={5000} value={feedback[submission.id] ?? ""} onChange={(event) => setFeedback((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Summarise what went well and what to improve…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <div className="flex items-center justify-between gap-3">
              {submission.status === "marked" ? <p className="text-xs text-[var(--muted-foreground)]">Last marked {submission.marked_at ? new Date(submission.marked_at).toLocaleString() : ""} · {submission.score} / {data.assignment.max_score}</p> : <span />}
              <button disabled={saving === submission.id} onClick={() => void mark(submission)} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving === submission.id ? "Saving…" : submission.status === "marked" ? "Update marking" : "Save marking"}
              </button>
            </div>
          </article>
        );
      }) : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">No learners have submitted this assignment yet.</p>}
      {notice ? <p role="status" className="text-sm text-emerald-600">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
