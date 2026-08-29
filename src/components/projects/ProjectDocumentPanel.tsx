"use client";

import { useMemo, useState } from "react";
import { FileText, LockKeyhole, Save } from "lucide-react";
import type { ProjectOutline, StudentProject } from "@/lib/projects/types";

export const EMPTY_PROJECT_OUTLINE: ProjectOutline = {
  problem: "",
  objectives: "",
  methodology: "",
  findings: "",
  conclusion: "",
  reflection: "",
};

export function outlineForProject(project: StudentProject): ProjectOutline {
  return { ...EMPTY_PROJECT_OUTLINE, ...(project.outline ?? {}) };
}

type Props = {
  project: StudentProject;
  onSave: (outline: ProjectOutline) => Promise<void> | void;
};

const fields: { key: keyof ProjectOutline; label: string; hint: string }[] = [
  { key: "problem", label: "Problem / background", hint: "Write what you actually established about the problem." },
  { key: "objectives", label: "Objectives", hint: "State what your project set out to achieve." },
  { key: "methodology", label: "Method / process", hint: "Describe what you actually did, in enough detail to reproduce it." },
  { key: "findings", label: "Findings / results", hint: "Record only results supported by your saved evidence." },
  { key: "conclusion", label: "Conclusion", hint: "Explain what your evidence lets you conclude." },
  { key: "reflection", label: "Evaluation / reflection", hint: "Record limitations, feedback, improvements and next steps." },
];

export default function ProjectDocumentPanel({ project, onSave }: Props) {
  const [draft, setDraft] = useState<ProjectOutline>(() => outlineForProject(project));
  const [saved, setSaved] = useState(true);
  const evidenceSummary = useMemo(
    () => project.evidence.map((item) => `• ${item.title} [${item.type.replaceAll("_", " ")}]`).join("\n"),
    [project.evidence],
  );

  async function save() {
    await onSave(draft);
    setSaved(true);
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6" aria-labelledby="project-document-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><FileText className="h-5 w-5" /></div>
          <div>
            <h2 id="project-document-title" className="font-bold text-[var(--foreground)]">Build your final document</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">This is your working outline. Shadecode does not write project evidence for you.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]"><LockKeyhole className="h-3.5 w-3.5" /> Learner-owned</div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {fields.map(({ key, label, hint }) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold text-[var(--foreground)]">{label}</span>
            <span className="mt-1 block text-[11px] leading-4 text-[var(--muted-foreground)]">{hint}</span>
            <textarea
              value={draft[key]}
              onChange={(event) => { setSaved(false); setDraft((current) => ({ ...current, [key]: event.target.value })); }}
              rows={5}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface-2)] p-4">
        <p className="text-xs font-semibold text-[var(--foreground)]">Evidence available to you</p>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Use these records when writing your document. Do not treat missing evidence as a fact.</p>
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--muted-foreground)]">{evidenceSummary || "No evidence has been captured yet."}</pre>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--muted-foreground)]">{saved ? "All outline changes saved locally." : "Unsaved outline changes."}</p>
        <button type="button" onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]"><Save className="h-4 w-4" /> Save outline</button>
      </div>
    </section>
  );
}
