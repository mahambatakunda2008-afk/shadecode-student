"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderKanban, Plus, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { buildInitialWorkPlan, createProject, loadProjects, saveProjects } from "@/lib/projects/store";
import { ProjectRequirements, StudentProject } from "@/lib/projects/types";

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

const initialRequirements: ProjectRequirements = {
  deliverable: "", requiredSections: "", teacherRubric: "", constraints: "", materials: "", physicalWork: "", digitalWork: "", preferredFormat: "mixed", assistanceLevel: "build_with_me",
};

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
  const [requirements, setRequirements] = useState<ProjectRequirements>(initialRequirements);

  const activeProjects = useMemo(() => projects.filter((project) => project.status !== "completed"), [projects]);
  const setReq = <K extends keyof ProjectRequirements>(key: K, value: ProjectRequirements[K]) => setRequirements((current) => ({ ...current, [key]: value }));

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const project = createProject({ title, subject, board, academicStage: defaultStage, gradeOrForm: grade, brief, requirements });
    project.workPlan = buildInitialWorkPlan(project);
    const next = [project, ...projects];
    setProjects(next);
    saveProjects(next);
    setTitle(""); setSubject(""); setBoard(""); setGrade(""); setBrief(""); setRequirements(initialRequirements); setCreating(false);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--primary-glow)] blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]"><FolderKanban className="h-4 w-4" /> Project Studio</div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">Bring the brief. We build the work plan.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] md:text-base">Give Shadecode the real requirements once. It can prepare the digital work, structure the report, model or presentation, and turn the project into an action list. You still do the physical work, observations, interviews and measurements that must actually happen.</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"><Plus className="h-4 w-4" /> Start a project</button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[{ icon: Sparkles, title: "Work-ready intake", text: "Capture the brief, rubric, deliverable, materials and constraints once." }, { icon: Wand2, title: "Build the digital side", text: "Shadecode can prepare plans, drafts, code, diagrams and document structure where the task allows it." }, { icon: ShieldCheck, title: "Evidence stays real", text: "AI work is labelled as scaffolding. Real-world observations, measurements and practical work remain yours." }].map(({ icon: Icon, title: cardTitle, text }) => <article key={cardTitle} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5"><Icon className="h-5 w-5 text-[var(--primary)]" /><h2 className="mt-3 text-sm font-bold text-[var(--foreground)]">{cardTitle}</h2><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{text}</p></article>)}
      </section>

      {creating && <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[var(--foreground)]">Start your project</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">The more of the real brief you provide, the less guessing the system has to do.</p></div><button type="button" onClick={() => setCreating(false)} className="text-sm font-semibold text-[var(--muted-foreground)]">Cancel</button></div><form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-[var(--foreground)]">Project title<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reducing plastic waste at school" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Subject / learning area<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Board / curriculum<input value={board} onChange={(e) => setBoard(e.target.value)} placeholder="e.g. ZIMSEC" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Grade / Form<input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Form 4" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label>
        <label className="text-sm font-medium text-[var(--foreground)] md:col-span-2">Teacher brief<textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} placeholder="Paste the complete instructions your teacher gave you..." className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 outline-none focus:border-[var(--primary)]" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Final deliverable<textarea value={requirements.deliverable} onChange={(e) => setReq("deliverable", e.target.value)} rows={3} placeholder="What must be submitted? Report, model, software, presentation..." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Required sections / rubric<textarea value={requirements.requiredSections} onChange={(e) => setReq("requiredSections", e.target.value)} rows={3} placeholder="Required headings, marks, rubric criteria..." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Teacher rubric / marking scheme<textarea value={requirements.teacherRubric} onChange={(e) => setReq("teacherRubric", e.target.value)} rows={3} placeholder="Paste it if you have it." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Constraints<textarea value={requirements.constraints} onChange={(e) => setReq("constraints", e.target.value)} rows={3} placeholder="Length, budget, deadline, allowed materials, required method..." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Materials / resources<textarea value={requirements.materials} onChange={(e) => setReq("materials", e.target.value)} rows={3} placeholder="What you have access to or must obtain." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Physical work required<textarea value={requirements.physicalWork} onChange={(e) => setReq("physicalWork", e.target.value)} rows={3} placeholder="Experiments, measurements, interviews, construction, field work..." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Digital work you want help with<textarea value={requirements.digitalWork} onChange={(e) => setReq("digitalWork", e.target.value)} rows={3} placeholder="Research structure, report draft, diagrams, code, calculations, slides..." className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3" /></label>
        <label className="text-sm font-medium text-[var(--foreground)]">Output format<select value={requirements.preferredFormat} onChange={(e) => setReq("preferredFormat", e.target.value as ProjectRequirements["preferredFormat"])} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3"><option value="mixed">Mixed</option><option value="report">Report</option><option value="model">Model</option><option value="prototype">Prototype</option><option value="presentation">Presentation</option><option value="software">Software</option></select></label>
        <label className="text-sm font-medium text-[var(--foreground)]">How much should Shadecode prepare?<select value={requirements.assistanceLevel} onChange={(e) => setReq("assistanceLevel", e.target.value as ProjectRequirements["assistanceLevel"])} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3"><option value="coach">Coach me</option><option value="build_with_me">Build with me</option><option value="prepare_draft">Prepare a draft for me to review</option></select></label>
        <div className="md:col-span-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 text-xs leading-5 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Important:</strong> Shadecode can prepare digital artefacts and scaffolding, but it will not fabricate interviews, measurements, observations, experimental results, attendance, signatures or other evidence that did not happen.</div>
        <div className="md:col-span-2 flex justify-end"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]">Create work-ready project <ArrowRight className="h-4 w-4" /></button></div>
      </form></section>}

      <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Workspace</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">Your projects</h2></div></div>{activeProjects.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-8 text-center"><FolderKanban className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" /><p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Nothing started yet.</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">Create your first project and Shadecode will turn the brief into a work-ready plan.</p></div> : <div className="mt-4 grid gap-4 md:grid-cols-2">{activeProjects.map((project) => { const currentIndex = project.stages.findIndex((stage) => stage.id === project.currentStageId); const progress = project.stages.length ? Math.round(((Math.max(0, currentIndex) + 1) / project.stages.length) * 100) : 0; return <Link key={project.id} href={`/projects/${project.id}`} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-[var(--foreground)]">{project.title}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{project.subject || "General"} · {project.board || "Board not specified"}</p></div><ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:translate-x-1 group-hover:text-[var(--primary)]" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]" aria-label={`${progress}% project progress`}><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">{progress}% through stages · {stageCopy[project.academicStage]}</p></Link>; })}</div>}</section>
    </main>
  );
}
