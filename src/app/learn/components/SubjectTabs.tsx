"use client";

import { cn } from "@/lib/utils";
import type { LearnSubject } from "../types";

interface SubjectTabsProps {
  subjects: LearnSubject[];
  selectedSubjectId: string;
  isLoading?: boolean;
  onSelect: (subjectId: string) => void;
}

export default function SubjectTabs({
  subjects,
  selectedSubjectId,
  isLoading = false,
  onSelect,
}: SubjectTabsProps) {
  const totalLessons = subjects.reduce(
    (total, subject) => total + subject.lessonCount,
    0
  );
  const tabs = [{ id: "all", name: "All", lessonCount: totalLessons }, ...subjects];

  return (
    <nav
      aria-label="Subjects"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max gap-2 rounded-lg border border-slate-200 bg-white/85 p-2 shadow-sm shadow-sky-100/60 backdrop-blur">
        {tabs.map((subject) => {
          const selected = selectedSubjectId === subject.id;

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition duration-200",
                selected
                  ? "bg-slate-950 text-white shadow-md shadow-slate-300/70"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700",
                isLoading && !selected && "opacity-70"
              )}
              disabled={isLoading && selected}
              key={subject.id}
              onClick={() => onSelect(subject.id)}
              type="button"
            >
              {subject.name}
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {subject.lessonCount}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
