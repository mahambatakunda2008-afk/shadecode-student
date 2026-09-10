"use client";

import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Route, ClipboardCheck } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const ROUTE_COPY: Record<string, { icon: typeof BookOpen; title: string; description: string }> = {
  "/curriculum": { icon: BookOpen, title: "Courses", description: "Keep your course or syllabus organised and see what comes next." },
  "/study-plan": { icon: Route, title: "Plan your learning", description: "Turn your goals into a realistic routine that fits your stage." },
  "/timetable": { icon: CalendarDays, title: "Your schedule", description: "Shape your study or work sessions around the time you actually have." },
  "/exam-hub": { icon: ClipboardCheck, title: "Exam preparation", description: "Practise with material that matches your level, board and goals." },
};

export default function ExperienceContextBanner() {
  const pathname = usePathname();
  const { profile, loading } = useUser();
  if (loading || !profile) return null;

  const experience = getAcademicExperience(normalizeStudyLevel(profile.study_level));
  const base = Object.keys(ROUTE_COPY).find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!base || !experience.allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null;

  const copy = ROUTE_COPY[base];
  const Icon = copy.icon;
  const stageNote = experience.family === "foundation"
    ? "Built for learning through small, clear steps."
    : experience.family === "school"
      ? "Built around your school subjects and deliberate practice."
      : "Built around courses, skills, practical work and real goals.";

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8" data-experience-context={experience.family}>
      <div className="mx-auto flex max-w-6xl items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--foreground)]">{copy.title}</p>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{copy.description}</p>
          <p className="mt-1 text-xs font-medium text-[var(--primary)]">{stageNote}</p>
        </div>
      </div>
    </div>
  );
}
