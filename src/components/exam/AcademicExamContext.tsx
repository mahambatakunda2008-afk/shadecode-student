"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

export default function AcademicExamContext() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));

  if (!experience.showExamSim) {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 md:mx-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
          <p className="text-[11px] leading-5 text-[var(--muted-foreground)]">
            Exam Simulation is not the focus of your {experience.label.toLowerCase()} experience. Use Learn and guided practice to build mastery first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 md:mx-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
        <div>
          <p className="text-[12px] font-semibold text-[var(--foreground)]">{experience.label} exam mode</p>
          <p className="text-[11px] leading-5 text-[var(--muted-foreground)]">Questions and pacing are intended for your academic stage.</p>
        </div>
      </div>
    </div>
  );
}
