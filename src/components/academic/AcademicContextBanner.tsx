"use client";

import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

export default function AcademicContextBanner() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));

  return (
    <div className="mx-4 mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 shadow-sm md:mx-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[var(--foreground)]">{experience.label} learning</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">Your lessons and study tools are tailored to this stage.</p>
        </div>
      </div>
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--primary)]">
        <Sparkles className="h-3.5 w-3.5" /> Change learning profile
      </Link>
    </div>
  );
}
