"use client";

import React, { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import type { CurriculumState, LessonRow } from "@/lib/curriculum";

type Props = {
  initialState?: CurriculumState | null;
};

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${className}`}>
      {children}
    </div>
  );
}

export default function LearningJourney({ initialState = null }: Props) {
  const [state, setState] = useState<CurriculumState | null | undefined>(initialState);
  const [loading, setLoading] = useState(initialState === null);

  useEffect(() => {
    if (initialState !== null) return;
    let mounted = true;
    setLoading(true);
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((d) => mounted && setState(d?.state ?? null))
      .catch(() => mounted && setState(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [initialState]);

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 bg-card rounded-lg shadow-sm animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/4 mb-4" />
        <div className="h-3 bg-gray-700 rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700" />
              <div className="flex-1 h-3 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 bg-card rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-2">Learning Journey</h3>
        <p className="text-xs text-muted-foreground">No curriculum found. Start learning to build your journey.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="default" size="sm">Open Learn</Button>
          <Button variant="ghost" size="sm">Explore Curriculum</Button>
        </div>
      </div>
    );
  }

  const lessons: LessonRow[] = state.allLessons ?? [];
  const completedIds = new Set(state.completedLessons?.map((l) => l.id) ?? []);
  const lockedIds = new Set(state.lockedLessons?.map((l) => l.id) ?? []);
  const currentId = state.currentLesson?.id ?? null;
  const recommendedId = state.recommendedNextLesson?.id ?? null;
  const completion = state.completionPercent ?? 0;

  // XP / milestone markers (visual only) at quarter completion thresholds
  const milestones = [25, 50, 75, 100];

  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-card rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Learning Journey</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completion}% complete</span>
        </div>
      </div>

      <div className="mb-4">
        <ProgressBar value={completion} max={100} />
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Timeline */}
        <div className="flex-1">
          <ol className="relative border-l border-muted-foreground/20 pl-6 space-y-4">
            {lessons.length === 0 && (
              <li className="text-xs text-muted-foreground">No lessons available in curriculum.</li>
            )}

            {lessons.map((lesson) => {
              const isCompleted = completedIds.has(lesson.id);
              const isLocked = lockedIds.has(lesson.id);
              const isCurrent = currentId === lesson.id;
              const isRecommended = recommendedId === lesson.id;

              let iconBg = "bg-gray-500";
              let icon = null;

              if (isCompleted) {
                iconBg = "bg-green-600";
                icon = "✓";
              } else if (isCurrent) {
                iconBg = "bg-purple-600";
                icon = "●";
              } else if (isRecommended) {
                iconBg = "bg-amber-500";
                icon = "★";
              } else if (isLocked) {
                iconBg = "bg-gray-400";
                icon = "🔒";
              } else {
                iconBg = "bg-slate-500";
                icon = "○";
              }

              return (
                <li key={lesson.id} className="mb-2">
                  <span className="absolute -left-5 flex items-center justify-center w-8 h-8 rounded-full text-white">
                    <span className={`${iconBg} w-8 h-8 rounded-full flex items-center justify-center text-xs`}>{icon}</span>
                  </span>

                  <div className="pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{lesson.title}</div>
                        <div className="text-xs text-muted-foreground">{isCompleted ? "Completed" : isCurrent ? "In progress" : isRecommended ? "Recommended" : isLocked ? "Locked" : "Upcoming"}</div>
                      </div>

                      {/* achievement marker example: mark when completed and recently updated (heuristic) */}
                      <div className="text-xs">
                        {isCompleted && <span className="text-green-400">Achievement</span>}
                        {isRecommended && <span className="text-amber-400">Next</span>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Side column: milestones & summary */}
        <div className="w-72 flex-shrink-0">
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2">Milestones</h4>
            <div className="flex flex-col gap-3">
              {milestones.map((m) => (
                <div key={m} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${completion >= m ? "bg-green-600 text-white" : "bg-gray-200 text-muted-foreground"}`}>{m}%</div>
                    <div className="text-xs">{m}% curriculum</div>
                  </div>
                  {completion >= m && <div className="text-xs text-green-400">Reached</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2">Summary</h4>
            <div className="text-xs text-muted-foreground">
              <div>Completed: {state.completedLessons?.length ?? 0}</div>
              <div>Current: {state.currentLesson?.title ?? "—"}</div>
              <div>Recommended: {state.recommendedNextLesson?.title ?? "—"}</div>
              <div>Locked: {state.lockedLessons?.length ?? 0}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="default" size="sm">Open Learn</Button>
            <Button variant="ghost" size="sm">See Curriculum</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
