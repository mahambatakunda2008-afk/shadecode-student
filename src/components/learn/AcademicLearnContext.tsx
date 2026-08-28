"use client";

import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

export default function AcademicLearnContext() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));

  const guidance: Record<string, string> = {
    primary: "Lessons are shorter and more guided, with practice woven into the learning.",
    "lower-secondary": "Build the concept first, then practise it step by step.",
    "upper-secondary": "Learn the concept, practise it, then test whether you can apply it.",
    "a-level": "Expect deeper explanations, syllabus-aware examples and exam-level application.",
    university: "Work from concepts to independent analysis, assignments and module-level mastery.",
    tvet: "Connect theory to practical skills, procedures and assessment tasks.",
    professional: "Focus on job-relevant knowledge, practical application and skill development.",
  };

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 md:mx-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span className="text-[12px] font-semibold text-[var(--foreground)]">{experience.label} learning mode</span>
            <Sparkles className="h-3 w-3 text-[var(--primary)]" aria-hidden />
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">{guidance[experience.stage]}</p>
        </div>
      </div>
    </div>
  );
}
