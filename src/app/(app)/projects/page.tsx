"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderKanban, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { createProject, loadProjects, saveProjects } from "@/lib/projects/store";
import { StudentProject } from "@/lib/projects/types";

const stageCopy: Record<StudentProject["academicStage"], string> = {
  foundation: "Simple prompts and hands-on evidence for younger learners.",
  secondary: "Structured investigation, evidence, development and evaluation.",
  advanced: "More rigorous research, analysis and technical documentation.",
  tertiary: "Research-led planning, evidence, analysis and presentation.",
};

function inferStage(level?: string | null): StudentProject["academicStage"] {
  const value = (level ?? "").toLowerCase();
  if (/primary|grade [1-7]|foundation|junior/.test(value)) return "foundation";
  if (/university|college|poly|tertiary/.test(value)) return "tertiary";
  if (/a level|advanced|upper|lower six|form 5|form 6/.test(value)) return "advanced";
  return "secondary";
}

export default function ProjectsPage() {
  const { profile } = useUser();
  const defaultStage = inferStage(profile?.study_level);
  const [projects, setProjects] = useState<StudentProject[]>(() => loadProjects());
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [board, setBoard] = useState("");
  const [grade, setGrade] = useState("");
  const [brief, setBrief] = useState("");

  const activeProjects = useMemo(() => projects.filter((project) => project.status !== "completed"), [projects]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const project = createProject({ title, subject, board, academicStage: defaultStage, gradeOrForm: grade, brief });
    const next = [project, ...projects];
    setProjects(next);
    saveProjects(next);
    setTitle(""); setSubject(""); setBoard(""); setGrade(""); setBrief(""); setCreating(false);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--primary-glow)] blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]"><FolderKanban className="h-4 w-4" /> Project Studio</div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">Do the project. Build the evidence.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] md:text-base">Plan, investigate, develop, present and evaluate your school project with Cortex as your coach. Shadecode helps you do the work. It does not invent evidence for you.</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"><Plus className="h-4 w-4" /> Start a project</button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[{ icon: Sparkles, title: "Cortex coach", text: "Get the next useful action instead of a giant answer." }, { icon: CheckCircle2, title: "Stage by stage", text: "Turn the project into manageable milestones." }, { icon: ShieldCheck, title: "Evidence safe", text: "Your real observations, sources and results stay distinguishable from AI scaffolding." }].map(({ icon: Icon, title: cardTitle, text }) => <article key={cardTitle} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5"><Icon className="h-5 w-5 text-[var(--primary)]" /><h2 className="mt-3 text-sm font-bold text-[var(--foreground)]">{cardTitle}</h2><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{text}</p></article>)}
      </section>

      {creating && <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[var(--foreground)]">Start your project</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Your academic stage is currently set to <strong>{defaultStage}</strong>. Board requirements should come from you or your teacher, not a guess.</p></div><button type="button" onClick={() => setCreating(false)} className="text-sm font-semibold text-[var(--muted-foreground)]">Cancel</button></div><form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-[var(--foreground)]">Project title<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reducing plastic waste at school" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label><label className="text-sm font-medium text-[var(--foreground)]">Subject / learning area<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label><label className="text-sm font-medium text-[var(--foreground)]">Board / curriculum<input value={board} onChange={(e) => setBoard(e.target.value)} placeholder="e.g. ZIMSEC" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label><label className="text-sm font-medium text-[var(--foreground)]">Grade / Form<input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade 7" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label><label className="text-sm font-medium text-[var(--foreground)] md:col-span-2">Teacher brief <span className="font-normal text-[var(--muted-foreground)]">(optional)</span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} placeholder="Paste the instructions your teacher gave you..." className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label><div className="md:col-span-2 flex justify-end"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]">Create project <ArrowRight className="h-4 w-4" /></button></div></form></section>}

      <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Workspace</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">Your projects</h2></div></div>{activeProjects.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><FolderKanban className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" /><p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Nothing started yet.</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">Create your first project and Shadecode will break it into stages.</p></div> : <div className="mt-4 grid gap-4 md:grid-cols-2">{activeProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-[var(--foreground)]">{project.title}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{project.subject || "General"} · {project.board || "Board not specified"}</p></div><ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.round((project.stages.findIndex((stage) => stage.id === project.currentStageId) / project.stages.length) * 100)}%` }} /></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">{stageCopy[project.academicStage]}</p></Link>)}</div>}</section>
    </main>
  );
}
