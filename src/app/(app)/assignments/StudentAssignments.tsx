"use client";

import { useEffect, useState } from "react";

type Submission = { submitted_at: string; status: "submitted" | "marked"; score: number | null; feedback: string | null; question_marks?: Array<{ questionNumber: number; marksAwarded: number; maxMarks: number; feedback: string }> } | null;
type Question = { prompt: string; type: "written" | "multiple_choice" | "calculation" | "practical"; marks: number; options: string[] };
type Assignment = {
  id: string; group_id: string; title: string; subject: string; instructions: string;
  due_at: string | null; max_score: number; assessment_type: string; questions: Question[];
  created_at: string; submission: Submission;
};

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [responses, setResponses] = useState<Record<string, Record<number, string>>>({});
  const [legacyResponses, setLegacyResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/platform/assignments", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load classwork.");
      setAssignments(payload.assignments ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load classwork.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(assignment: Assignment) {
    const answers = responses[assignment.id] ?? {};
    if (assignment.questions.length && assignment.questions.some((_, index) => !(answers[index] ?? "").trim())) {
      setError("Complete each question before submitting.");
      return;
    }
    const responseText = assignment.questions.map((question, index) =>
      `Question ${index + 1} (${question.marks} marks)\n${answers[index] ?? ""}`
    ).join("\n\n");
    if (!responseText.trim()) { setError("Write your answer before submitting."); return; }
    setSaving(assignment.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/platform/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, response: responseText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not submit your work.");
      setNotice("Your work has been submitted.");
      setResponses((current) => ({ ...current, [assignment.id]: {} }));
      setLegacyResponses((current) => ({ ...current, [assignment.id]: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your work.");
    } finally { setSaving(null); }
  }

  if (loading) return <p role="status" className="text-sm text-[var(--muted-foreground)]">Loading your classwork…</p>;

  return (
    <div className="space-y-5">
      {assignments.length ? assignments.map((assignment) => (
        <article key={assignment.id} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{assignment.subject} · {assignment.assessment_type}</p><h2 className="mt-1 text-lg font-semibold">{assignment.title}</h2></div>
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">{assignment.submission?.status === "marked" ? "Feedback ready" : assignment.submission ? "Submitted" : "To do"}</span>
          </div>
          {assignment.instructions ? <p className="whitespace-pre-wrap text-sm leading-6">{assignment.instructions}</p> : null}
          <p className="text-xs text-[var(--muted-foreground)]">{assignment.max_score} marks{assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleString()}` : ""}</p>
          {assignment.submission?.status === "marked" ? (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
              <p className="font-semibold">Your result: {assignment.submission.score} / {assignment.max_score}</p>
              {assignment.submission.feedback ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{assignment.submission.feedback}</p> : <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your teacher has marked this work.</p>}
              {assignment.submission.question_marks?.length ? (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Question-by-question feedback</h3>
                  {assignment.submission.question_marks.map((mark) => (
                    <div key={mark.questionNumber} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                      <div className="flex items-center justify-between gap-3 text-sm font-medium">
                        <span>Question {mark.questionNumber}</span>
                        <span>{mark.marksAwarded} / {mark.maxMarks}</span>
                      </div>
                      {mark.feedback ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{mark.feedback}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {assignment.submission ? <p className="text-xs text-[var(--muted-foreground)]">Submitted {new Date(assignment.submission.submitted_at).toLocaleString()}. You can update your response before the deadline.</p> : null}
              {!assignment.questions.length ? (
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Your answer / working</span>
                  <textarea rows={5} maxLength={30000} value={legacyResponses[assignment.id] ?? ""} onChange={(event) => setLegacyResponses((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Write your answer or explain your working…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
                </label>
              ) : null}
              {assignment.questions.map((question, index) => (
                <section key={index} className="space-y-2 rounded-xl bg-[var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">Question {index + 1}</h3><span className="text-xs text-[var(--muted-foreground)]">{question.marks} marks</span></div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{question.prompt}</p>
                  {question.type === "multiple_choice" ? (
                    <label className="block space-y-1 text-sm"><span className="text-xs text-[var(--muted-foreground)]">Choose one answer</span>
                      <select value={responses[assignment.id]?.[index] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [assignment.id]: { ...(current[assignment.id] ?? {}), [index]: event.target.value } }))} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5"><option value="">Select an answer</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                    </label>
                  ) : (
                    <label className="block space-y-1 text-sm"><span className="text-xs text-[var(--muted-foreground)]">{question.type === "calculation" ? "Show your method and working" : question.type === "practical" ? "Describe your method, observations or practical evidence" : "Your answer"}</span>
                      <textarea rows={4} maxLength={30000} value={responses[assignment.id]?.[index] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [assignment.id]: { ...(current[assignment.id] ?? {}), [index]: event.target.value } }))} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5" />
                    </label>
                  )}
                </section>
              ))}
              <button disabled={saving === assignment.id} onClick={() => void submit(assignment)} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving === assignment.id ? "Submitting…" : assignment.submission ? "Update submission" : "Submit work"}</button>
            </div>
          )}
        </article>
      )) : <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-6 text-center"><h2 className="font-semibold">No classwork yet</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Published assignments from your classes will appear here.</p></div>}
      {notice ? <p role="status" className="text-sm text-emerald-600">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
