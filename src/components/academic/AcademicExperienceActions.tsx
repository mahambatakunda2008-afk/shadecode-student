"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardCheck, Gamepad2, GraduationCap, PenLine, Route, Sparkles, Wrench } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const ICONS: Record<string, typeof BookOpen> = {
  discovery: Sparkles,
  stories: BookOpen,
  numbers: Gamepad2,
  world: Sparkles,
  learn: BookOpen,
  practice: Gamepad2,
  challenge: Gamepad2,
  plan: Route,
  progress: ClipboardCheck,
  papers: ClipboardCheck,
  simulation: Gamepad2,
  syllabus: GraduationCap,
  analytics: ClipboardCheck,
  programme: GraduationCap,
  studyspace: PenLine,
  workmate: BriefcaseBusiness,
  careers: GraduationCap,
  training: BookOpen,
  practical: Wrench,
  assessment: ClipboardCheck,
  career: GraduationCap,
  develop: Sparkles,
  work: BriefcaseBusiness,
  projects: BriefcaseBusiness,
};

const SECTION_COPY = {
  foundation: { eyebrow: "Your learning", helper: "A simple place to discover, practise and keep growing." },
  school: { eyebrow: "Your study", helper: "The tools you need for learning, practice and progress." },
  "beyond-school": { eyebrow: "Your workspace", helper: "Your learning, work and next steps in one place." },
} as const;

export default function AcademicExperienceActions() {
  const { profile } = useUser();
  const stage = normalizeStudyLevel(profile?.study_level);
  const experience = getAcademicExperience(stage);
  const copy = SECTION_COPY[experience.family];

  return (
    <section className="mx-4 mb-6 md:mx-6" aria-labelledby="academic-actions-title" data-study-level={stage} data-experience={experience.family}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">{copy.eyebrow}</p>
          <h2 id="academic-actions-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">{experience.primaryAction}</h2>
        </div>
        <span className="hidden text-xs text-[var(--muted-foreground)] sm:block">{copy.helper}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {experience.modules.map(({ id, href, label, description }) => {
          const Icon = ICONS[id] ?? BookOpen;
          return (
            <Link key={`${href}-${id}`} href={href} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Icon className="h-4.5 w-4.5" /></div>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-[var(--foreground)]">{label}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p></div>
                <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
