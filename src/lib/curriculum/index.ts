import { createClient } from "@/lib/supabase/client";

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
  completionPercent: number;
};

export function computeCurriculumState(lessons: LessonRow[], prereqRows: Array<{ lesson_id: string; prerequisite_lesson_id: string }>): CurriculumState {
  const lessonIds = lessons.map((l) => l.id);
  prereqRows = (prereqRows ?? []).filter((r) => lessonIds.includes(r.lesson_id) && lessonIds.includes(r.prerequisite_lesson_id));
  const prereqMap: Record<string, string[]> = {};
  for (const r of prereqRows) {
    if (!prereqMap[r.lesson_id]) prereqMap[r.lesson_id] = [];
    if (r.lesson_id !== r.prerequisite_lesson_id) prereqMap[r.lesson_id].push(r.prerequisite_lesson_id);
  }
  (function removeIntraCycleEdges() {
    const indices: Record<string, number> = {}, lowlink: Record<string, number> = {}, onStack: Record<string, boolean> = {};
    const stack: string[] = [], sccs: string[][] = [];
    let idx = 0;
    function strongconnect(v: string) {
      indices[v] = idx; lowlink[v] = idx; idx++; stack.push(v); onStack[v] = true;
      for (const w of prereqMap[v] ?? []) {
        if (indices[w] === undefined) { strongconnect(w); lowlink[v] = Math.min(lowlink[v], lowlink[w]); }
        else if (onStack[w]) lowlink[v] = Math.min(lowlink[v], indices[w]);
      }
      if (lowlink[v] === indices[v]) {
        const comp: string[] = []; let w: string | undefined;
        do { w = stack.pop(); if (!w) break; onStack[w] = false; comp.push(w); } while (w !== v);
        if (comp.length > 0) sccs.push(comp);
      }
    }
    for (const id of lessonIds) if (indices[id] === undefined) strongconnect(id);
    for (const comp of sccs) if (comp.length > 1) {
      const compSet = new Set(comp);
      for (const node of comp) if (prereqMap[node]) prereqMap[node] = prereqMap[node].filter((p) => !compSet.has(p));
    }
  })();
  const completedSet = new Set(lessons.filter((l) => (l.progress ?? 0) >= 100).map((l) => l.id));
  const isUnlocked = (lessonId: string) => { const reqs = prereqMap[lessonId] ?? []; return reqs.length === 0 || reqs.every((rid) => completedSet.has(rid)); };
  const completedLessons = lessons.filter((l) => (l.progress ?? 0) >= 100);
  const unlockedIncomplete = lessons.filter((l) => !completedSet.has(l.id) && isUnlocked(l.id));
  const lockedLessons = lessons.filter((l) => !isUnlocked(l.id));
  unlockedIncomplete.sort((a, b) => (a.updated_at ? new Date(a.updated_at).getTime() : 0) - (b.updated_at ? new Date(b.updated_at).getTime() : 0));
  const currentLesson = unlockedIncomplete.length > 0 ? unlockedIncomplete[0] : null;
  let recommendedNextLesson = currentLesson;
  if (!recommendedNextLesson) {
    const incomplete = lessons.filter((l) => (l.progress ?? 0) < 100);
    if (incomplete.length > 0) {
      const ranked = incomplete.map((l) => ({ lesson: l, unmet: (prereqMap[l.id] ?? []).filter((r) => !completedSet.has(r)).length, updatedTs: l.updated_at ? new Date(l.updated_at).getTime() : 0 })).sort((a, b) => a.unmet !== b.unmet ? a.unmet - b.unmet : b.updatedTs - a.updatedTs);
      recommendedNextLesson = ranked.length > 0 ? ranked[0].lesson : null;
    } else recommendedNextLesson = null;
  }
  const completionPercent = lessons.length === 0 ? 0 : Math.round(lessons.reduce((s, l) => s + (l.progress ?? 0), 0) / lessons.length);
  return { currentLesson, recommendedNextLesson, completedLessons, lockedLessons, allLessons: lessons, completionPercent };
}

export async function getCurriculumState(userId?: string) {
  const supabase = createClient();
  if (!userId) { const { data } = await supabase.auth.getUser(); if (!data?.user?.id) return null; userId = data.user.id; }
  const { data: lessonsData, error: lessonsErr } = await supabase.from("learn_lessons").select("id, title, subject_id, difficulty, progress, updated_at").eq("user_id", userId).order("created_at", { ascending: true });
  if (lessonsErr) { console.error("[curriculum] failed to load lessons:", lessonsErr); return null; }
  const lessons = (lessonsData ?? []) as LessonRow[];
  const lessonIds = lessons.map((l) => l.id);
  let prereqRows: Array<{ lesson_id: string; prerequisite_lesson_id: string }> = [];
  if (lessonIds.length > 0) {
    const { data: pData, error: pErr } = await supabase.from("lesson_prerequisites").select("lesson_id, prerequisite_lesson_id").in("lesson_id", lessonIds);
    if (pErr) console.error("[curriculum] failed to load prerequisites:", pErr);
    else prereqRows = (pData ?? []).filter((r: any) => lessonIds.includes(r.prerequisite_lesson_id));
  }
  return computeCurriculumState(lessons, prereqRows);
}

export async function isLessonUnlocked(lessonId: string, userId?: string) { const s = await getCurriculumState(userId); return s ? !s.lockedLessons.find((l) => l.id === lessonId) : false; }
export async function getNextAvailableLessons(userId?: string) { const s = await getCurriculumState(userId); if (!s) return null; return s.allLessons.filter((l) => (l.progress ?? 0) < 100 && !s.lockedLessons.find((x) => x.id === l.id)).sort((a, b) => (a.updated_at ? new Date(a.updated_at).getTime() : 0) - (b.updated_at ? new Date(b.updated_at).getTime() : 0)); }
export async function getPathCompletion(userId?: string) { const s = await getCurriculumState(userId); if (!s) return { completionPercent: 0, total: 0, completed: 0 }; return { completionPercent: s.completionPercent, total: s.allLessons.length, completed: s.completedLessons.length }; }

export * from "./types";
export * from "./zimsec";
export * from "./cambridge";
export * from "./coverage";
export * from "./readiness";
export * from "./data/cambridge-computer-science-candidate-content";
export * from "./data/cambridge-computer-science-requirements";
