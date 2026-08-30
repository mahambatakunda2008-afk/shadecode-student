"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, LockKeyhole, Play, Save, ShieldCheck } from "lucide-react";
import type { GeneratedProjectArtifact } from "@/lib/projects/projectWorkerExecutor";
import { executeProjectWorker } from "@/lib/projects/projectWorkerExecutor";
import type { ProjectOutline, StudentProject } from "@/lib/projects/types";
import { listWorkObjects, saveWorkObject } from "@/lib/studyspace/store";
import type { WorkObject } from "@/lib/studyspace/types";

export const EMPTY_PROJECT_OUTLINE: ProjectOutline = { problem: "", objectives: "", methodology: "", findings: "", conclusion: "", reflection: "" };

export function outlineForProject(project: StudentProject): ProjectOutline {
  return { ...EMPTY_PROJECT_OUTLINE, ...(project.outline ?? {}) };
}

type Props = { project: StudentProject; onSave: (outline: ProjectOutline) => Promise<void> | void };

const fields: { key: keyof ProjectOutline; label: string; hint: string }[] = [
  { key: "problem", label: "Problem / background", hint: "Write what you actually established about the problem." },
  { key: "objectives", label: "Objectives", hint: "State what your project set out to achieve." },
  { key: "methodology", label: "Method / process", hint: "Describe what you actually did, in enough detail to reproduce it." },
  { key: "findings", label: "Findings / results", hint: "Record only results supported by your saved evidence." },
  { key: "conclusion", label: "Conclusion", hint: "Explain what your evidence lets you conclude." },
  { key: "reflection", label: "Evaluation / reflection", hint: "Record limitations, feedback, improvements and next steps." },
];

const artifactId = (projectId: string, taskId: string) => `project-artifact:${projectId}:${taskId}`;

function toWorkObject(artifact: GeneratedProjectArtifact, project: StudentProject): WorkObject {
  return {
    id: artifactId(project.id, artifact.taskId),
    mode: "workmate",
    status: "draft",
    subject: project.subject,
    topic: project.title,
    prompt: `Project Studio worker: ${artifact.title}`,
    response: artifact.content,
    createdAt: artifact.generatedAt,
    updatedAt: new Date().toISOString(),
  };
}

export default function ProjectDocumentPanel({ project, onSave }: Props) {
  const [draft, setDraft] = useState<ProjectOutline>(() => outlineForProject(project));
  const [saved, setSaved] = useState(true);
  const [running, setRunning] = useState(false);
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<GeneratedProjectArtifact[]>([]);
  const evidenceSummary = useMemo(() => project.evidence.map((item) => `• ${item.title} [${item.type.replaceAll("_", " ")}]`).join("\n"), [project.evidence]);

  useEffect(() => {
    let active = true;
    void listWorkObjects().then((objects) => {
      if (!active) return;
      const restored = objects
        .filter((item) => item.id.startsWith(`project-artifact:${project.id}:`) && typeof item.response === "string")
        .map((item) => ({
          id: item.id,
          taskId: item.id.split(":").slice(2).join(":"),
          kind: "mixed" as GeneratedProjectArtifact["kind"],
          title: item.prompt?.replace("Project Studio worker: ", "") || "Generated project draft",
          status: "draft" as const,
          provenance: "shadecode-generated" as const,
          content: item.response || "",
          editable: true as const,
          generatedAt: item.createdAt,
        }));
      setArtifacts(restored);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [project.id]);

  async function save() { await onSave(draft); setSaved(true); }

  async function runWorker() {
    if (running) return;
    setRunning(true); setWorkerMessage(null);
    try {
      const result = executeProjectWorker(project);
      await Promise.all(result.artifacts.map((artifact) => saveWorkObject(toWorkObject(artifact, project))));
      setArtifacts(result.artifacts);
      setWorkerMessage(result.artifacts.length ? `${result.artifacts.length} editable draft${result.artifacts.length === 1 ? "" : "s"} generated and saved to StudySpace.` : "The worker found no unblocked digital task. Complete the required real-world evidence first.");
    } catch (error) {
      console.error("[Project Studio] worker execution failed", error);
      setWorkerMessage("The worker could not save its drafts locally. Your project data is unchanged.");
    } finally { setRunning(false); }
  }

  async function saveArtifact(artifact: GeneratedProjectArtifact) {
    const next = { ...artifact, generatedAt: artifact.generatedAt };
    await saveWorkObject(toWorkObject(next, project));
    setArtifacts((current) => current.map((item) => item.id === artifact.id ? next : item));
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6" aria-labelledby="project-document-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><FileText className="h-5 w-5" /></div>
          <div><h2 id="project-document-title" className="font-bold text-[var(--foreground)]">Build your final document</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Your outline stays learner-owned. Generated scaffolding is clearly labelled and never becomes project evidence.</p></div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]"><LockKeyhole className="h-3.5 w-3.5" /> Learner-owned</div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm font-bold text-[var(--foreground)]">Cortex Project Worker</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Turn the current brief into safe, editable digital scaffolds. Tasks needing measurements, interviews, observations, construction or testing remain blocked.</p></div>
          <button type="button" onClick={() => void runWorker()} disabled={running} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-wait disabled:opacity-60"><Play className="h-4 w-4" /> {running ? "Working…" : "Run worker"}</button>
        </div>
        {workerMessage && <p className="mt-3 text-xs font-medium text-[var(--muted-foreground)]" role="status">{workerMessage}</p>}
        {artifacts.length > 0 && <div className="mt-4 space-y-3">{artifacts.map((artifact) => <article key={artifact.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Generated draft</p><h3 className="mt-1 text-sm font-bold text-[var(--foreground)]">{artifact.title}</h3></div><span className="rounded-md bg-[var(--primary-glow)] px-2 py-1 text-[10px] font-semibold text-[var(--primary)]">NOT EVIDENCE</span></div><textarea value={artifact.content} onChange={(event) => setArtifacts((current) => current.map((item) => item.id === artifact.id ? { ...item, content: event.target.value } : item))} rows={8} className="mt-3 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 font-mono text-xs leading-5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]" /><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-[var(--muted-foreground)]">Saved in local StudySpace · editable scaffold</p><button type="button" onClick={() => void saveArtifact(artifact)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--foreground)]"><Save className="h-3.5 w-3.5" /> Save draft</button></div></article>)}</div>}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--card-border)] p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><p className="text-[11px] leading-5 text-[var(--muted-foreground)]">Generated drafts can organize and accelerate your work. They cannot claim that an interview happened, a measurement was taken, a prototype was built, or a result was observed.</p></div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {fields.map(({ key, label, hint }) => <label key={key} className="block"><span className="text-xs font-semibold text-[var(--foreground)]">{label}</span><span className="mt-1 block text-[11px] leading-4 text-[var(--muted-foreground)]">{hint}</span><textarea value={draft[key]} onChange={(event) => { setSaved(false); setDraft((current) => ({ ...current, [key]: event.target.value })); }} rows={5} className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none focus:border-[var(--primary)]" /></label>)}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface-2)] p-4"><p className="text-xs font-semibold text-[var(--foreground)]">Evidence available to you</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Use these records when writing your document. Do not treat missing evidence as a fact.</p><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--muted-foreground)]">{evidenceSummary || "No evidence has been captured yet."}</pre></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-[var(--muted-foreground)]">{saved ? "All outline changes saved locally." : "Unsaved outline changes."}</p><button type="button" onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]"><Save className="h-4 w-4" /> Save outline</button></div>
    </section>
  );
}
