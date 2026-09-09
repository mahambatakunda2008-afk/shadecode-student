"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, Gamepad2, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

export default function AcademicExperienceHero() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));

  const primaryHref = experience.stage === "early-childhood" || experience.stage === "primary" ? "/discovery" : experience.stage === "university" ? "/curriculum" : experience.stage === "tvet" ? "/workmate" : "/learn";
  const secondaryHref = experience.stage === "early-childhood" ? "/discovery" : experience.showExamSim ? "/exam-sim" : experience.stage === "university" ? "/studyspace" : experience.stage === "primary" ? "/daily-challenge" : "/tasks";
  const eyebrow = experience.stage === "early-childhood" ? "Today, let's explore" : experience.stage === "primary" ? "Your learning day" : experience.family === "school" ? "Your study space" : "Your academic workspace";
  const shape = experience.family === "foundation" ? "rounded-[26px]" : experience.family === "school" ? "rounded-[22px]" : "rounded-[18px]";

  return (
    <section aria-labelledby="academic-experience-title" data-study-level={experience.stage} data-experience={experience.family} className={`mx-4 mt-4 mb-5 overflow-hidden border border-[var(--card-border)] bg-[var(--surface)] shadow-sm md:mx-6 ${shape}`}>
      <div className="relative p-5 md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[var(--primary-glow)] blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[var(--primary)]"><Sparkles className="h-3.5 w-3.5" />{eyebrow}</div>
            <h1 id="academic-experience-title" className="text-[25px] font-bold tracking-tight text-[var(--foreground)] md:text-[30px]">{experience.homeTitle}</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[var(--muted-foreground)]">{experience.homeSubtitle}</p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-[12px] font-semibold text-white transition-transform hover:-translate-y-0.5">
              {experience.stage === "university" || experience.stage === "tvet" ? <BriefcaseBusiness className="h-4 w-4" /> : experience.stage === "early-childhood" ? <Sparkles className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              {experience.primaryAction}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href={secondaryHref} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-2.5 text-[12px] font-semibold text-[var(--foreground)]">
              {experience.showExamSim ? <Gamepad2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{experience.secondaryAction}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
