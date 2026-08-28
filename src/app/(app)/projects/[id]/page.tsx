"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, Lightbulb, Plus, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { loadProjects, saveProjects } from "@/lib/projects/store";
import { ProjectEvidenceType, StudentProject } from "@/lib/projects/types";

const evidenceTypes: { value: ProjectEvidenceType; label: string }[] = [
  { value: "note", label: "Note" }, { value: "observation", label: "Observation" }, { value: "interview", label: "Interview" },
  { value: "questionnaire", label: "Questionnaire" }, { value: "measurement", label: "Measurement" }, { value: "calculation", label: "Calculation" },
  { value: "source", label: "Source" }, { value: "sketch", label: "Sketch" }, { value: "prototype", label: "Prototype" }, { value: "teacher_feedback", label: "Teacher feedback" },
];

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const [projects, setProjects] = useState<StudentProject[]>(() => loadProjects());
  const project = projects.find((item) => item.id === params.id);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceContent, setEvidenceContent] = useState("");
  const [evidenceType, setEvidenceType] = useState<ProjectEvidenceType>("note");

  const stageIndex = useMemo(() => project ? Math.max(0, project.stages.findIndex((stage) => stage.id === project.currentStageId)) : 0, [project]);
  const stage = project?.stages[stageIndex];
  const stageEvidence = project?.evidence.filter((item) => item.stageId === stage?.id) ?? [];

  if (!project || !stage) return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold text-[var(--foreground)]">Project not found</h1><Link href="/projects" className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">Back to Projects</Link></main>;

  function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evidenceTitle.trim() || !evidenceContent.trim()) return;
    const updated = projects.map((item) => item.id !== project.id ? item : ({
      ...item,
      status: "active" as const,
      updatedAt: new Date().toISOString(),
      evidence: [...item.evidence, { id: `evidence-${Date.now()}`, type: evidenceType, title: evidenceTitle.trim(), content: evidenceContent.trim(), createdAt: new Date().toISOString(), stageId: stage.id, source: "learner" as const }],
    }));
    setProjects(updated); saveProjects(updated); setEvidenceTitle(""); setEvidenceContent("");
  }

  function moveStage() {
    if (stageIndex >= project.stages.length - 1) return;
    const nextStage = project.stages[stageIndex + 1];
    const updated = projects.map((item) => item.id !== project.id ? item : ({ ...item, currentStageId: nextStage.id, status: "active" as const, updatedAt: new Date().toISOString() }));
    setProjects(updated); saveProjects(updated);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> Projects</Link>
      <header className="mt-5 rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{project.subject} · {project.board}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">{project.title}</h1>{project.brief && <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{project.brief}</p>}</div><div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted-foreground)]">{project.gradeOrForm || project.academicStage}</div></div><div className="mt-6 grid grid-cols-6 gap-1">{project.stages.map((item, index) => <div key={item.id} className="h-1.5 rounded-full bg-[var(--surface-3)]" data-current={index === stageIndex}>{index <= stageIndex && <div className="h-full w-full rounded-full bg-[var(--primary)]" />}</div>)}</div></header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Stage {stageIndex + 1} of {project.stages.length}</p><h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{stage.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{stage.description}</p><div className="mt-5 rounded-xl bg-[var(--surface-2)] p-4"><p className="text-sm font-semibold text-[var(--foreground)]">Your job</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{stage.learnerAction}</p></div><div className="mt-4 rounded-xl border border-[var(--card-border)] p-4"><p className="text-sm font-semibold text-[var(--foreground)]">Evidence to collect</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{stage.evidencePrompt}</p></div><div className="mt-6 flex items-center gap-3"><button type="button" onClick={moveStage} disabled={stageIndex >= project.stages.length - 1} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40">Complete stage <CheckCircle2 className="h-4 w-4" /></button><span className="text-xs text-[var(--muted-foreground)]">Only move on when your evidence is ready.</span></div></section>

        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-[var(--primary)]" /><h2 className="font-bold text-[var(--foreground)]">Cortex coach</h2></div><p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Start with the task in front of you. Ask Cortex to explain the stage, brainstorm questions, review your notes, or help you decide what evidence you still need.</p><div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3"><ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--primary)]" /><p className="text-xs leading-5 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Evidence rule:</strong> Shadecode will help you structure real work, but it must not turn invented interviews, results, measurements or observations into project evidence.</p></div></aside>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold text-[var(--foreground)]">Evidence notebook</h2><p className="text-xs text-[var(--muted-foreground)]">Capture what you actually did, found, measured or received.</p></div></div><form onSubmit={addEvidence} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px]"><input required value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Evidence title" className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)]" /><select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as ProjectEvidenceType)} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm outline-none">{evidenceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><textarea required value={evidenceContent} onChange={(e) => setEvidenceContent(e.target.value)} rows={4} placeholder="Write your actual notes, findings, response, measurement, source details, etc." className="resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)] md:col-span-2" /><div className="md:col-span-2 flex justify-end"><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]"><Plus className="h-4 w-4" /> Save evidence</button></div></form><div className="mt-6 space-y-3">{stageEvidence.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">No evidence captured for this stage yet. That's okay. Start with the first real thing you did.</p> : stageEvidence.map((item) => <article key={item.id} className="rounded-xl border border-[var(--card-border)] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3><span className="rounded-md bg-[var(--primary-glow)] px-2 py-1 text-[10px] font-semibold text-[var(--primary)]">{item.type.replaceAll("_", " ")}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{item.content}</p></article>)}</div></section>
    </main>
  );
}
