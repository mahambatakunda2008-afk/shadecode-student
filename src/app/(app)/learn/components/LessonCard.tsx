import Link from "next/link";
import { BookOpenCheck, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LearnLesson, LessonDifficulty } from "../types";
import ProgressBar from "./ProgressBar";

interface LessonCardProps {
  lesson: LearnLesson;
}

const difficultyStyles: Record<
  LessonDifficulty,
  {
    label: string;
    pill: string;
    accent: string;
    progress: string;
  }
> = {
  easy: {
    label: "Easy",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    accent: "bg-emerald-500",
    progress: "from-emerald-400 to-teal-500",
  },
  medium: {
    label: "Medium",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    accent: "bg-amber-500",
    progress: "from-amber-400 to-orange-500",
  },
  hard: {
    label: "Hard",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    accent: "bg-rose-500",
    progress: "from-rose-400 to-red-500",
  },
};

export default function LessonCard({ lesson }: LessonCardProps) {
  const difficulty = difficultyStyles[lesson.difficulty];
  const progressFill = lesson.completed
    ? "from-emerald-400 to-green-500"
    : difficulty.progress;

  return (
    <Link
      className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-1 hover:scale-[1.015] hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
      href={`/learn/${encodeURIComponent(lesson.id)}`}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", difficulty.accent)} />

      {lesson.completed && (
        <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3 pr-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--muted)] text-sky-600 transition group-hover:bg-sky-100">
          <BookOpenCheck className="h-5 w-5" />
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1",
            difficulty.pill
          )}
        >
          {difficulty.label}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
          {lesson.subject}
        </p>
        <h3 className="mt-2 text-lg font-black leading-tight text-[var(--foreground)]">
          {lesson.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {lesson.description || "No description has been added yet."}
        </p>
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--muted-foreground)]">
          <span>{lesson.completed ? "Completed" : "In progress"}</span>
          <span>{lesson.progress}%</span>
        </div>
        <ProgressBar fillClassName={progressFill} value={lesson.progress} />
      </div>
    </Link>
  );
}
