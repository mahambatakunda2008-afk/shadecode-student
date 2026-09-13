"use client";

import { Boxes, Code2, Database, FileSpreadsheet, Globe2, MonitorCog, TerminalSquare } from "lucide-react";
import { COMP_LAB_ENVIRONMENTS } from "@/lib/comp-lab/environments";
import CodeLabWorkspace from "@/components/code-lab/CodeLabWorkspace";

const ICONS = { console: TerminalSquare, web: Globe2, "windows-forms": MonitorCog, database: Database, spreadsheet: FileSpreadsheet, desktop: MonitorCog } as const;

export default function CompLabWorkspace() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <header className="border-b border-[var(--card-border)] p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-white"><Boxes className="h-6 w-6" /></div><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">Shadecode Student</p><h1 className="text-3xl font-bold text-[var(--foreground)]">Comp Lab</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">A computing environment for learning, building, testing and understanding software across school, university and beyond.</p></div></div>
      </header>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {COMP_LAB_ENVIRONMENTS.map((item) => { const Icon = ICONS[item.projectType]; return <div key={item.id} className="rounded-2xl border border-[var(--card-border)] p-4"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--primary)]" /><div><h2 className="text-sm font-semibold text-[var(--foreground)]">{item.label}</h2><p className="text-xs text-[var(--muted-foreground)]">{item.status === "browser" ? "Available now" : item.status === "external-runtime" ? "Runtime integration" : item.status === "artifact" ? "Workspace integration" : "Planned"}</p></div></div><p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</p></div>; })}
      </div>
      <footer className="border-t border-[var(--card-border)] p-4 text-xs text-[var(--muted-foreground)]"><Code2 className="mr-2 inline h-4 w-4" />Comp Lab is the student-facing computing environment. The future physical Shadecode Lab remains separate.</footer>
    </section>
    <div className="mt-6"><CodeLabWorkspace /></div>
  </main>;
}
