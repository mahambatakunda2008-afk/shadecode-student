"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, ShieldCheck } from "lucide-react";
import type { StudentProject } from "@/lib/projects/types";
import { createProjectSnapshot, listProjectSnapshots, restoreProjectSnapshot, type ProjectSnapshot } from "@/lib/projects/recovery";
import { formatSnapshotTime, snapshotReasonLabel } from "@/lib/projects/recoveryUi";

export function ProjectRecoveryPanel({ project, onRestore }: { project: StudentProject; onRestore: (project: StudentProject) => Promise<void> | void }) {
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setSnapshots(await listProjectSnapshots(project.id)); } catch { setSnapshots([]); }
  }

  useEffect(() => { void refresh(); }, [project.id]);

  async function saveCheckpoint() {
    setBusy(true);
    try { await createProjectSnapshot(project, "manual"); await refresh(); } finally { setBusy(false); }
  }

  async function restore(snapshot: ProjectSnapshot) {
    if (!window.confirm(`Restore the project from ${formatSnapshotTime(snapshot.createdAt)}? Your current state will first be preserved.`)) return;
    setBusy(true);
    try {
      await createProjectSnapshot(project, "before-restore");
      await onRestore(await restoreProjectSnapshot(snapshot));
      await refresh();
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2"><History className="h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold text-[var(--foreground)]">Project history</h2><p className="text-xs text-[var(--muted-foreground)]">Recent local recovery points. No internet required.</p></div></div>
        <button type="button" disabled={busy} onClick={() => void saveCheckpoint()} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50">Save checkpoint</button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--muted-foreground)]"><ShieldCheck className="h-4 w-4 flex-shrink-0 text-[var(--primary)]" />Restoring keeps a checkpoint of the state you're leaving, so recovery itself can be undone.</div>
      <div className="mt-4 space-y-2">
        {snapshots.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No recovery points yet. Shadecode will create them as you work.</p> : snapshots.map((snapshot) => <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] p-3"><div><p className="text-sm font-semibold text-[var(--foreground)]">{snapshotReasonLabel(snapshot.reason)}</p><p className="text-xs text-[var(--muted-foreground)]">{formatSnapshotTime(snapshot.createdAt)}</p></div><button type="button" disabled={busy} onClick={() => void restore(snapshot)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Restore</button></div>)}
      </div>
    </section>
  );
}
