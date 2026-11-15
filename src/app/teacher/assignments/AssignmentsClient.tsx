"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Group = { id: string; name: string };
type QuestionDraft = { prompt: string; type: "written" | "multiple_choice" | "calculation" | "practical"; marks: string; optionsText: string; correctOption: string };
type Assignment = {
  id: string; group_id: string; title: string; subject: string; instructions: string;
  due_at: string | null; max_score: number; status: "draft" | "published" | "archived";
  assessment_type?: string; created_at: string;
};

const newQuestion = (): QuestionDraft => ({ prompt: "", type: "written", marks: "10", optionsText: "", correctOption: "" });

export function AssignmentsClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assessmentType, setAssessmentType] = useState("assignment");
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [markSchemeText, setMarkSchemeText] = useState("");
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const totalMarks = useMemo(() => questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0), [questions]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/assignments", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load classwork.");
      setGroups(payload.groups ?? []);
      setAssignments(payload.assignments ?? []);
      setGroupId((current) => current || payload.groups?.[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load classwork.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  }

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const normalizedQuestions: Array<{ prompt: string; type: QuestionDraft["type"]; marks: number; options?: string[]; correctOption?: string }> = questions.map((question) => ({
        prompt: question.prompt.trim(),
        type: question.type,
        marks: Number(question.marks),
        ...(question.type === "multiple_choice" ? {
          options: question.optionsText.split("\n").map((option) => option.trim()).filter(Boolean),
          correctOption: question.correctOption.trim(),
        } : {}),
      }));
      if (normalizedQuestions.some((question) => !question.prompt || !Number.isFinite(question.marks) || question.marks <= 0)) {
        throw new Error("Every question needs instructions and a positive mark value.");
      }
      if (normalizedQuestions.some((question) => question.type === "multiple_choice" && (!question.options || question.options.length < 2 || !question.correctOption || !question.options.includes(question.correctOption)))) {
        throw new Error("Each multiple-choice question needs at least two options and a correct option selected from them.");
      }
      if (normalizedQuestions.reduce((sum, question) => sum + question.marks, 0) !== totalMarks) throw new Error("Check the question marks.");
      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId, title, subject, instructions, maxScore: totalMarks,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null, publish, assessmentType,
          questions: normalizedQuestions,
          markScheme: markSchemeText.split("\n").map((criterion) => criterion.trim()).filter(Boolean).map((criterion) => ({ criterion })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create assessment.");
      setTitle(""); setSubject(""); setInstructions(""); setDueAt("");
      setAssessmentType("assignment"); setQuestions([newQuestion()]); setMarkSchemeText("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create assessment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Assessment Studio</p>
          <h2 className="mt-1 text-lg font-semibold">Create learning work</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Build assignments, quizzes, tests, examinations or practical assessments with structured questions and a teacher-only mark scheme.</p>
        </div>
        {groups.length ? (
          <form onSubmit={createAssignment} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm"><span className="font-medium">Teaching group</span>
                <select required value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Assessment type</span>
                <select value={assessmentType} onChange={(event) => setAssessmentType(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">
                  <option value="assignment">Assignment</option><option value="quiz">Quiz</option><option value="test">Test</option><option value="examination">Examination</option><option value="practical">Practical</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Subject</span>
                <input required maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Title</span>
                <input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Differentiation assessment" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
              </label>
              <label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">Instructions for learners</span>
                <textarea maxLength={12000} rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Explain the task, allowed materials, time guidance and submission expectations." className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
              </label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Due date (optional)</span>
                <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
              </label>
              <div className="rounded-xl bg-[var(--surface)] p-3"><p className="text-xs text-[var(--muted-foreground)]">Assessment total</p><p className="mt-1 text-xl font-semibold tabular-nums">{totalMarks} marks</p><p className="text-xs text-[var(--muted-foreground)]">Calculated from question marks</p></div>
            </div>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Questions</h3><p className="text-xs text-[var(--muted-foreground)]">Question marks must add up to the assessment total.</p></div>
                <button type="button" onClick={() => setQuestions((current) => [...current, newQuestion()])} disabled={questions.length >= 100} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Add question</button>
              </div>
              {questions.map((question, index) => (
                <article key={index} className="space-y-3 rounded-xl border border-[var(--card-border)] p-4">
                  <div className="flex items-center justify-between gap-3"><h4 className="font-medium">Question {index + 1}</h4>
                    <button type="button" onClick={() => setQuestions((current) => current.filter((_, position) => position !== index))} disabled={questions.length === 1} className="text-xs text-red-500 disabled:opacity-40">Remove</button>
                  </div>
                  <label className="block space-y-1 text-sm"><span>Question prompt</span><textarea required maxLength={8000} rows={3} value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm"><span>Response type</span><select value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as QuestionDraft["type"] })} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5"><option value="written">Written response</option><option value="calculation">Calculation / working</option><option value="multiple_choice">Multiple choice</option><option value="practical">Practical evidence</option></select></label>
                    <label className="space-y-1 text-sm"><span>Marks</span><input required type="number" min="0.5" max="10000" step="0.5" value={question.marks} onChange={(event) => updateQuestion(index, { marks: event.target.value })} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
                  </div>
                  {question.type === "multiple_choice" ? <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm"><span>Options (one per line)</span><textarea rows={4} value={question.optionsText} onChange={(event) => updateQuestion(index, { optionsText: event.target.value })} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
                    <label className="space-y-1 text-sm"><span>Correct option (exact text)</span><input value={question.correctOption} onChange={(event) => updateQuestion(index, { correctOption: event.target.value })} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
                  </div> : null}
                </article>
              ))}
            </section>

            <label className="block space-y-1.5 text-sm"><span className="font-medium">Mark scheme / marking criteria</span><textarea rows={4} value={markSchemeText} onChange={(event) => setMarkSchemeText(event.target.value)} placeholder="One criterion or expected marking point per line. Keep this teacher-only." className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /><span className="text-xs text-[var(--muted-foreground)]">Stored separately from learner instructions. Use this to guide consistent marking.</span></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publish immediately for learners</label>
            <button disabled={saving || !groupId || !questions.length} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : publish ? "Create and publish" : "Save draft"}</button>
          </form>
        ) : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No teaching groups are assigned to this account yet. Connect a class first.</p>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold">Classwork and assessments</h2><p className="text-sm text-[var(--muted-foreground)]">Learning work created for your teaching groups.</p></div>
        {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading assessments…</p> : assignments.length ? <div className="space-y-3">
          {assignments.map((assignment) => <article key={assignment.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold"><Link href={`/teacher/assignments/${assignment.id}`} className="hover:text-[var(--primary)] hover:underline">{assignment.title}</Link></h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{assignment.subject} · {groups.find((group) => group.id === assignment.group_id)?.name ?? "Teaching group"}</p></div><span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">{assignment.status === "published" ? "Published" : assignment.status === "draft" ? "Draft" : "Archived"}</span></div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{assignment.assessment_type ?? "assignment"} · {assignment.max_score} marks{assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleString()}` : " · No due date"}</p>
          </article>)}
        </div> : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No assessments yet. Create the first one above.</p>}
      </section>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">{error}</p> : null}
    </div>
  );
}
