"use client";

import React, { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import type { CurriculumState } from "@/lib/curriculum";

type Props = {
  // Optional server-provided snapshot to avoid client fetch when embedding server-side
  initialState?: CurriculumState | null;
};

export default function CurriculumProgressCard({ initialState = null }: Props) {
  const [state, setState] = useState<CurriculumState | null | undefined>(initialState);
  const [loading, setLoading] = useState(initialState === null);

  useEffect(() => {
    if (initialState !== null) return; // server provided

    let mounted = true;
    setLoading(true);
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setState(data?.state ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setState(null);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [initialState]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-card rounded-lg shadow-sm animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-3 bg-gray-700 rounded mb-2" />
        <div className="h-3 bg-gray-700 rounded mb-6" />
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-gray-700 rounded" />
          <div className="flex-1 h-10 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Empty state (no curriculum data available)
  if (!state) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-card rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-2">Curriculum Progress</h3>
        <p className="text-xs text-muted-foreground">No curriculum data available. Visit Learn to get started.</p>
        <div className="mt-4">
          <Button variant="outline" size="sm">Open Learn</Button>
        </div>
      </div>
    );
  }

  const percent = state.completionPercent ?? state?.completionPercent ?? 0; // compatibility
  const currentTitle = state.currentLesson?.title ?? null;
  const recommendedTitle = state.recommendedNextLesson?.title ?? null;
  const completedCount = state.completedLessons?.length ?? 0;
  const lockedCount = state.lockedLessons?.length ?? 0;

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-card rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Curriculum Progress</h3>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>

      <div className="mb-3">
        <ProgressBar value={percent} max={100} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Current lesson</p>
          <p className="text-sm font-medium">{currentTitle ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Recommended next</p>
          <p className="text-sm font-medium">{recommendedTitle ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Completed lessons</p>
          <p className="text-sm font-medium">{completedCount}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Locked lessons</p>
          <p className="text-sm font-medium">{lockedCount}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="default" size="sm">Open Curriculum</Button>
        <Button variant="ghost" size="sm">View Learn</Button>
      </div>
    </div>
  );
}
