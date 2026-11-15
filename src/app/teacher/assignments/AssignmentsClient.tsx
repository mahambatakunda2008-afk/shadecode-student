"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };
type Assignment = {
  id: string;
  group_id: string;
  title: string;
  subject: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  status: "draft" | "published" | "archived";
  created_at: string;
};

export function AssignmentsClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId, title, subject, instructions, maxScore: Number(maxScore),
          dueAt: dueAt ? new Date(dueAt).toISOString() : null, publish,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create assignment.");
      setTitle("");
      setSubject("");
      setInstructions("");
      setDueAt("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Create classwork</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Set work for one of your actively assigned teaching groups.</p>
        </div>
        {groups.length ? (
          <form onSubmit={createAssignment} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Class</span>
              <select required value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Subject</span>
              <input required maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Assignment title</span>
              <input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Differentiation practice" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Instructions and resources</span>
              <textarea maxLength={12000} rows={4} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Explain what learners should complete. You can add resource links here." className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Due date (optional)</span>
              <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Total marks</span>
              <input required type="number" min="1" max="100000" step="0.5" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
              Publish immediately for learners
            </label>
            <div className="sm:col-span-2">
              <button disabled={saving || !groupId} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving…" : publish ? "Create and publish" : "Save draft"}
              </button>
            </div>
          </form>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No teaching groups are assigned to this account yet. Connect a class first.</p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Classwork</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Assignments created for your teaching groups.</p>
        </div>
        {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading assignments…</p> : assignments.length ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{assignment.subject} · {groups.find((group) => group.id === assignment.group_id)?.name ?? "Teaching group"}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">{assignment.status === "published" ? "Published" : assignment.status === "draft" ? "Draft" : "Archived"}</span>
                </div>
                {assignment.instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{assignment.instructions}</p> : null}
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">{assignment.max_score} marks{assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleString()}` : " · No due date"}</p>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No assignments yet. Create the first piece of classwork above.</p>}
      </section>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">{error}</p> : null}
    </div>
  );
}
