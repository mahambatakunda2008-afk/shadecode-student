"use client";

import { useMemo } from "react";
import { ClipboardCheck, Hammer, ListChecks, Sparkles } from "lucide-react";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { useUser } from "@/hooks/useUser";
import TasksLocalFirstV2 from "@/components/tasks/TasksLocalFirstV2";

export default function ExperienceTasks() {
  const { profile } = useUser();
  const experience = useMemo(() => getAcademicExperience(normalizeStudyLevel(profile?.study_level)), [profile?.study_level]);
  const foundation = experience.family === "foundation";
  const beyond = experience.family === "beyond-school";
  const copy = foundation
    ? { eyebrow: "Keep going", title: "Small steps count.", body: "Keep track of the things you want to practise today. Finish one, then choose what comes next.", icon: Sparkles }
    : beyond
      ? { eyebrow: "Work", title: "Keep your work moving.", body: "Turn assignments, practical work and real goals into clear next actions. Your task list belongs to the work you are actually doing.", icon: Hammer }
      : { eyebrow: "Practice", title: "Turn study into action.", body: "Keep revision focused with concrete tasks. Use what you learn, finish the next step and build evidence of progress.", icon: ClipboardCheck };
  const Icon = copy.icon;
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-7 text-[var(--foreground)] sm:px-6 lg:px-8" data-experience={experience.family} data-study-level={experience.stage}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Icon className="h-5 w-5" /></div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><ListChecks className="h-4 w-4" /> {copy.eyebrow}</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.title}</h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--muted-foreground)]">{copy.body}</p>
            </div>
          </div>
        </header>
        <TasksLocalFirstV2 />
      </div>
    </main>
  );
}
