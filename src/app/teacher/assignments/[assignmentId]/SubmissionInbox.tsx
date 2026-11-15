"use client";

import { useEffect, useState } from "react";

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
};
type Assignment = { id: string; title: string; subject: string; max_score: number; due_at: string | null; status: string };
type Payload = { assignment: Assignment; group: { name: string } | null; submissions: Submission[] };

export function SubmissionInbox({ assignmentId }: { assignmentId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load submissions.");
    }
  }

  useEffect(() => { void load(); }, [assignmentId]);

  async function mark(submission: Submission) {
    const score = Number(scores[submission.id]);
    if (!Number.isFinite(score) || score < 0 || score > (data?.assignment.max_score ?? 0)) {
      setError(`Enter a score between 0 and ${data?.assignment.max_score ?? 0}.`);
      return;
    }
    setSaving(submission.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, score, feedback: feedback[submission.id] ?? "" }),
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

      {data.submissions.length ? data.submissions.map((submission) => (
        <article key={submission.id} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{submission.student_name}</h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">{submission.status === "marked" ? "Marked" : "Awaiting marking"}</span>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Learner response</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{submission.response || "No written response provided."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Score / {data.assignment.max_score}</span>
              <input type="number" min="0" max={data.assignment.max_score} step="0.5" value={scores[submission.id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [submission.id]: event.target.value }))} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Feedback</span>
              <textarea rows={2} maxLength={5000} value={feedback[submission.id] ?? ""} onChange={(event) => setFeedback((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Explain what went well and what to improve…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            {submission.status === "marked" ? <p className="text-xs text-[var(--muted-foreground)]">Last marked {submission.marked_at ? new Date(submission.marked_at).toLocaleString() : ""}</p> : <span />}
            <button disabled={saving === submission.id} onClick={() => void mark(submission)} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving === submission.id ? "Saving…" : submission.status === "marked" ? "Update feedback" : "Save marking"}
            </button>
          </div>
        </article>
      )) : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">No learners have submitted this assignment yet.</p>}
      {notice ? <p role="status" className="text-sm text-emerald-600">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
