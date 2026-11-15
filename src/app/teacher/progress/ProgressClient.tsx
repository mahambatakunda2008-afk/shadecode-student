"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };
type Learner = {
  studentId: string;
  name: string;
  assignmentsSubmitted: number;
  assignmentsMarked: number;
  assignmentsAvailable: number;
  awaitingMarking: number;
  averagePercent: number | null;
};
type Report = { group: Group; evidenceWindow: { assignments: number }; learners: Learner[] };

export function ProgressClient({ groups }: { groups: Group[] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!groupId) { setReport(null); return; }
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/teacher/progress?groupId=${encodeURIComponent(groupId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load progress.");
        return payload as Report;
      })
      .then((payload) => { if (active) setReport(payload); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load progress."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  return (
    <div className="space-y-5">
      {groups.length ? (
        <label className="block max-w-md space-y-1.5 text-sm">
          <span className="font-medium">Teaching group</span>
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">No active teaching groups are available yet.</p>
      )}

      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">{error}</p> : null}
      {loading ? <p role="status" className="text-sm text-[var(--muted-foreground)]">Loading learning evidence…</p> : null}

      {report && !loading ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Evidence coverage">
            <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Learners</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{report.learners.length}</p>
            </article>
            <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Assignments in evidence window</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{report.evidenceWindow.assignments}</p>
            </article>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Learner progress</h2>
              <p className="text-sm text-[var(--muted-foreground)]">A view of recorded classwork and marking. Missing evidence is shown as “Not enough data”, never as zero achievement.</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[var(--surface)] text-xs text-[var(--muted-foreground)]">
                  <tr><th scope="col" className="px-4 py-3 font-medium">Learner</th><th scope="col" className="px-4 py-3 font-medium">Work submitted</th><th scope="col" className="px-4 py-3 font-medium">Awaiting marking</th><th scope="col" className="px-4 py-3 font-medium">Marked average</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {report.learners.map((learner) => (
                    <tr key={learner.studentId}>
                      <th scope="row" className="px-4 py-3 font-medium">{learner.name}</th>
                      <td className="px-4 py-3 tabular-nums">{learner.assignmentsSubmitted} submitted · {learner.assignmentsMarked} marked</td>
                      <td className="px-4 py-3 tabular-nums">{learner.awaitingMarking}</td>
                      <td className="px-4 py-3 tabular-nums">{learner.averagePercent === null ? "Not enough data" : `${learner.averagePercent}%`}</td>
                    </tr>
                  ))}
                  {!report.learners.length ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No active learners in this group.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
