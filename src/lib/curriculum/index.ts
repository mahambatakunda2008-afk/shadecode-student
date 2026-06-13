import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LessonRow = {
  id: string;
  title: string;
  subject_id: string;
  difficulty?: string | null;
  progress: number;
  updated_at?: string | null;
};

export type CurriculumState = {
  currentLesson: LessonRow | null;
  recommendedNextLesson: LessonRow | null;
  completedLessons: LessonRow[];
  lockedLessons: LessonRow[];
  allLessons: LessonRow[];
  completionPercent: number; // 0-100
};

/**
 * Fetches user's lessons and prerequisites, computes unlocked/locked/completed state.
 * Designed to be minimal and server-side safe; intended for Cortex integration and API usage.
 */
export function computeCurriculumState(
  lessons: LessonRow[],
  prereqRows: Array<{ lesson_id: string; prerequisite_lesson_id: string }>
): CurriculumState {
  const lessonIds = lessons.map((l) => l.id);

  // Filter out prereq rows that reference lessons not in this lesson set (missing/deleted/external)
  prereqRows = (prereqRows ?? []).filter((r) => lessonIds.includes(r.lesson_id) && lessonIds.includes(r.prerequisite_lesson_id));

  // Build map: lesson_id -> prereq ids[]
  const prereqMap: Record<string, string[]> = {};
  for (const r of prereqRows) {
    if (!prereqMap[r.lesson_id]) prereqMap[r.lesson_id] = [];
    // avoid self-loop entries
    if (r.lesson_id !== r.prerequisite_lesson_id) {
      prereqMap[r.lesson_id].push(r.prerequisite_lesson_id);
    }
  }

  // Detect cycles (Tarjan's algorithm) and ignore intra-cycle edges.
  // This is a minimal mitigation: prerequisites that only reference lessons within the same
  // strongly-connected component are ignored so a prerequisite cycle doesn't deadlock the path.
  (function removeIntraCycleEdges() {
    const ids = lessonIds;
    const indices: Record<string, number> = {};
    const lowlink: Record<string, number> = {};
    const onStack: Record<string, boolean> = {};
    const stack: string[] = [];
    let idx = 0;
    const sccs: string[][] = [];

    function strongconnect(v: string) {
      indices[v] = idx;
      lowlink[v] = idx;
      idx++;
      stack.push(v);
      onStack[v] = true;

      const neighbors = prereqMap[v] ?? [];
      for (const w of neighbors) {
        if (indices[w] === undefined) {
          strongconnect(w);
          lowlink[v] = Math.min(lowlink[v], lowlink[w]);
        } else if (onStack[w]) {
          lowlink[v] = Math.min(lowlink[v], indices[w]);
        }
      }

      if (lowlink[v] === indices[v]) {
        const comp: string[] = [];
        let w: string | undefined;
        do {
          w = stack.pop();
          if (!w) break;
          onStack[w] = false;
          comp.push(w);
        } while (w !== v);
        if (comp.length > 0) sccs.push(comp);
      }
    }

    for (const id of ids) {
      if (indices[id] === undefined) strongconnect(id);
    }

    for (const comp of sccs) {
      if (comp.length <= 1) continue;
      const compSet = new Set(comp);
      for (const node of comp) {
        if (!prereqMap[node]) continue;
        // remove edges pointing to nodes inside the same SCC
        prereqMap[node] = prereqMap[node].filter((p) => !compSet.has(p));
      }
    }
  })();

  const completedSet = new Set(lessons.filter((l) => (l.progress ?? 0) >= 100).map((l) => l.id));

  function isUnlocked(lessonId: string) {
    const reqs = prereqMap[lessonId] ?? [];
    if (reqs.length === 0) return true;
    return reqs.every((rid) => completedSet.has(rid));
  }

  // Partition lessons
  const completedLessons = lessons.filter((l) => (l.progress ?? 0) >= 100);
  const unlockedIncomplete = lessons.filter((l) => !completedSet.has(l.id) && isUnlocked(l.id));
  const lockedLessons = lessons.filter((l) => !isUnlocked(l.id));

  // Determine current lesson: first unlocked incomplete (by updated_at or creation order)
  unlockedIncomplete.sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return ta - tb;
  });

  const currentLesson = unlockedIncomplete.length > 0 ? unlockedIncomplete[0] : null;

  // recommendedNextLesson: choose incomplete lesson with fewest unmet prerequisites; tie-break by most recent activity
  let recommendedNextLesson = currentLesson;
  if (!recommendedNextLesson) {
    const incomplete = lessons.filter((l) => (l.progress ?? 0) < 100);
    if (incomplete.length > 0) {
      const ranked = incomplete
        .map((l) => {
          const reqs = prereqMap[l.id] ?? [];
          const unmet = reqs.filter((r) => !completedSet.has(r)).length;
          const updatedTs = l.updated_at ? new Date(l.updated_at).getTime() : 0;
          return { lesson: l, unmet, updatedTs };
        })
        .sort((a, b) => {
          if (a.unmet !== b.unmet) return a.unmet - b.unmet;
          return b.updatedTs - a.updatedTs; // most recent first
        });
      recommendedNextLesson = ranked.length > 0 ? ranked[0].lesson : null;
    } else {
      recommendedNextLesson = null;
    }
  }

  // completion percent: average progress across all lessons (or 0 if none)
  const completionPercent = lessons.length === 0 ? 0 : Math.round(lessons.reduce((s, l) => s + (l.progress ?? 0), 0) / lessons.length);

  const state: CurriculumState = {
    currentLesson,
    recommendedNextLesson,
    completedLessons,
    lockedLessons,
    allLessons: lessons,
    completionPercent,
  };

  return state;
}

export async function getCurriculumState(userId?: string) {
  const supabase = await createSupabaseServerClient();

  if (!userId) {
    // Try auth session
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) {
      return null;
    }
    userId = data.user.id;
  }

  // 1. Load all lessons for this user
  const { data: lessonsData, error: lessonsErr } = await supabase
    .from("learn_lessons")
    .select("id, title, subject_id, difficulty, progress, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (lessonsErr) {
    console.error("[curriculum] failed to load lessons:", lessonsErr);
    return null;
  }

  const lessons = (lessonsData ?? []) as LessonRow[];
  const lessonIds = lessons.map((l) => l.id);

  // 2. Load prerequisite rows where lesson_id refers to a user's lesson
  let prereqRows: Array<{ lesson_id: string; prerequisite_lesson_id: string }> = [];
  if (lessonIds.length > 0) {
    const { data: pData, error: pErr } = await supabase
      .from("lesson_prerequisites")
      .select("lesson_id, prerequisite_lesson_id")
      .in("lesson_id", lessonIds);

    if (pErr) {
      console.error("[curriculum] failed to load prerequisites:", pErr);
    } else {
      // Filter prerequisites to only include those that reference lessons owned by this user
      // (ignore missing/deleted/external lesson references)
      const raw = pData ?? [];
      prereqRows = raw.filter((r: any) => lessonIds.includes(r.prerequisite_lesson_id));
    }
  }

  return computeCurriculumState(lessons, prereqRows);
}

export async function isLessonUnlocked(lessonId: string, userId?: string) {
  const s = await getCurriculumState(userId);
  if (!s) return false;
  return !s.lockedLessons.find((l) => l.id === lessonId);
}

export async function getNextAvailableLessons(userId?: string) {
  const s = await getCurriculumState(userId);
  if (!s) return null;
  // Return unlocked incomplete lessons ordered by updated_at
  return s.allLessons.filter((l) => (l.progress ?? 0) < 100 && !s.lockedLessons.find((x) => x.id === l.id))
    .sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return ta - tb;
    });
}

export async function getPathCompletion(userId?: string) {
  const s = await getCurriculumState(userId);
  if (!s) return { completionPercent: 0, total: 0, completed: 0 };
  return { completionPercent: s.completionPercent, total: s.allLessons.length, completed: s.completedLessons.length };
}

// Export curriculum intelligence layer
export * from "./types";
export * from "./zimsec";
export * from "./cambridge";
export * from "./coverage";
export * from "./readiness";
