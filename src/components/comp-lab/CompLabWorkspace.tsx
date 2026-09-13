"use client";

import { useState } from "react";
import { Boxes, CheckCircle2, Code2, Database, FileSpreadsheet, Globe2, MonitorCog, TerminalSquare } from "lucide-react";
import { COMP_LAB_ENVIRONMENTS, type CompLabEnvironment } from "@/lib/comp-lab/environments";
import CodeLabWorkspace from "@/components/code-lab/CodeLabWorkspace";

const ICONS = { console: TerminalSquare, web: Globe2, "windows-forms": MonitorCog, database: Database, spreadsheet: FileSpreadsheet, desktop: MonitorCog } as const;

function statusLabel(status: CompLabEnvironment["status"]) {
  if (status === "browser") return "Available now";
  if (status === "external-runtime") return "External runtime target";
  if (status === "artifact") return "Workspace integration";
  return "Runtime planned";
}

export default function CompLabWorkspace() {
  const [selectedId, setSelectedId] = useState("javascript-console");
  const selected = COMP_LAB_ENVIRONMENTS.find((item) => item.id === selectedId) ?? COMP_LAB_ENVIRONMENTS[0];
  const selectedIsCodeWorkspace = selected.id === "javascript-console" || selected.id === "web";
  const Icon = ICONS[selected.projectType];

  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <section className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
      <header className="border-b border-[var(--card-border)] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white"><Boxes className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Shadecode Student</p>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Comp Lab</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">One computing workspace that adapts to the learner's level, syllabus and objectives. School practicals, advanced study, university work and independent projects belong in the same environment.</p>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--card-border)] bg-[var(--surface-muted)]/40 px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-[var(--foreground)]">Choose an environment</h2><p className="text-xs text-[var(--muted-foreground)]">Availability describes the execution technology, not an exam-board restriction.</p></div>
          <span className="hidden rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[10px] text-[var(--muted-foreground)] sm:inline">{COMP_LAB_ENVIRONMENTS.length} environments</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMP_LAB_ENVIRONMENTS.map((item) => { const ItemIcon = ICONS[item.projectType]; const active = item.id === selected.id; return <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-3 text-left transition ${active ? "border-[var(--primary)] bg-[var(--primary)]/8 ring-1 ring-[var(--primary)]/20" : "border-[var(--card-border)] hover:bg-[var(--surface-muted)]"}`}><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)]"><ItemIcon className="h-4 w-4 text-[var(--primary)]" /></div><div className="min-w-0"><div className="truncate text-sm font-semibold text-[var(--foreground)]">{item.label}</div><div className="text-[10px] text-[var(--muted-foreground)]">{statusLabel(item.status)}</div></div></div></button>; })}
        </div>
      </div>

      <div className="border-b border-[var(--card-border)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><Icon className="h-5 w-5 text-[var(--primary)]" /></div><div><div className="flex items-center gap-2"><h2 className="font-semibold text-[var(--foreground)]">{selected.label}</h2>{selected.status === "browser" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</div><p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted-foreground)]">{selected.description}</p><div className="mt-2 flex flex-wrap gap-1.5">{selected.curriculumTags.slice(0, 5).map(tag => <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{tag}</span>)}</div></div></div>
          </div>
        </div>
      </div>

      {selectedIsCodeWorkspace ? <div className="p-3 sm:p-5"><CodeLabWorkspace /></div> : <div className="p-6 sm:p-8"><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-muted)]/50 p-6"><div className="flex items-start gap-3"><Code2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div><h3 className="font-semibold text-[var(--foreground)]">Environment target is defined</h3><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Comp Lab will use the correct runtime or artifact workflow for this environment rather than pretending a browser runtime is equivalent. The next runtime layer connects compilation, execution, diagnostics and learning evidence for this target.</p><p className="mt-3 text-xs text-[var(--muted-foreground)]">Languages: {selected.languages.length ? selected.languages.join(", ") : "workspace artifact"}</p></div></div></div></div>}

      <footer className="border-t border-[var(--card-border)] p-4 text-xs text-[var(--muted-foreground)]"><Code2 className="mr-2 inline h-4 w-4" />Comp Lab is the student-facing computing environment. Curriculum mapping comes from the learner's academic profile, while the future physical Shadecode Lab remains separate.</footer>
    </section>
  </main>;
}
