"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardCheck, Gamepad2, GraduationCap, PenLine, Route, Sparkles, Wrench } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

type Action = { href: string; title: string; description: string; icon: typeof BookOpen };

const ACTIONS: Record<string, Action[]> = {
  primary: [
    { href: "/learn", title: "Learn", description: "Short lessons made for your stage.", icon: BookOpen },
    { href: "/daily-challenge", title: "Challenge", description: "A quick activity to build confidence.", icon: Gamepad2 },
    { href: "/tasks", title: "My tasks", description: "Keep today's schoolwork moving.", icon: ClipboardCheck },
  ],
  "lower-secondary": [
    { href: "/learn", title: "Learn", description: "Build concepts step by step.", icon: BookOpen },
    { href: "/exam-sim", title: "Practice", description: "Try focused exam-style questions.", icon: Gamepad2 },
    { href: "/study-plan", title: "Study plan", description: "Turn goals into a simple routine.", icon: Route },
  ],
  "upper-secondary": [
    { href: "/learn", title: "Learn", description: "Master difficult topics with guided lessons.", icon: BookOpen },
    { href: "/exam-hub", title: "Exam Hub", description: "Find papers and revision material.", icon: ClipboardCheck },
    { href: "/exam-sim", title: "Exam Sim", description: "Practise under realistic conditions.", icon: Gamepad2 },
  ],
  "a-level": [
    { href: "/learn", title: "Deep Learn", description: "Attack weak topics at syllabus depth.", icon: GraduationCap },
    { href: "/exam-hub", title: "Past papers", description: "Work from real exam material.", icon: ClipboardCheck },
    { href: "/exam-sim", title: "Exam Sim", description: "Test timing, knowledge and technique.", icon: Gamepad2 },
  ],
  university: [
    { href: "/curriculum", title: "My programme", description: "Organise modules around your degree.", icon: GraduationCap },
    { href: "/studyspace", title: "StudySpace", description: "Think, write, calculate and work in one place.", icon: PenLine },
    { href: "/workmate", title: "Workmate", description: "Turn assignments and problems into organised work.", icon: BriefcaseBusiness },
  ],
  tvet: [
    { href: "/workmate", title: "Practical work", description: "Organise projects, evidence and tasks.", icon: Wrench },
    { href: "/studyspace", title: "StudySpace", description: "Combine theory, working and practical notes.", icon: PenLine },
    { href: "/exams", title: "Assessments", description: "Keep assessment preparation together.", icon: ClipboardCheck },
  ],
  professional: [
    { href: "/learn", title: "Develop", description: "Build knowledge around your current goals.", icon: Sparkles },
    { href: "/workmate", title: "Workmate", description: "Turn real work into an organised workspace.", icon: BriefcaseBusiness },
    { href: "/studyspace", title: "StudySpace", description: "Keep notes, reasoning and reference work together.", icon: PenLine },
  ],
};

export default function AcademicExperienceActions() {
  const { profile } = useUser();
  const stage = normalizeStudyLevel(profile?.study_level);
  const experience = getAcademicExperience(stage);
  const actions = ACTIONS[stage] ?? ACTIONS["upper-secondary"];

  return (
    <section className="mx-4 mb-6 md:mx-6" aria-labelledby="academic-actions-title" data-study-level={stage}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">Your workspace</p>
          <h2 id="academic-actions-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">Built for {experience.shortLabel}</h2>
        </div>
        <span className="hidden text-xs text-[var(--muted-foreground)] sm:block">Your tools change with your stage</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Icon className="h-4.5 w-4.5" /></div>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p></div>
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
