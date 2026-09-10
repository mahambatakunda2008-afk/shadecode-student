"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Lock, Route, TrendingUp, Zap } from "lucide-react";
import CurriculumProgressCard from "@/components/CurriculumProgressCard";
import LearningJourney from "@/components/LearningJourney";
import { withTimeout, TimeoutError } from "@/lib/async/withTimeout";
import { saveDashboardCache, loadDashboardCache } from "@/lib/offline/dashboardCache";
import { createClient } from "@/lib/supabase/client";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { useUser } from "@/contexts/UserContext";
import type { CurriculumState, LessonRow } from "@/lib/curriculum";

const FETCH_TIMEOUT_MS = 15000;
interface Subject { id: string; name: string; }
interface CurriculumPayload { state: CurriculumState | null; subjects: Subject[]; }

const COPY = {
  foundation: { title: "Your learning path", subtitle: "See what you have explored, what is next, and where you are growing.", stats: "Learning", next: "Next to explore", progress: "Your progress", journey: "Your journey", by: "Progress by subject", start: "Start learning" },
  school: { title: "Courses & syllabus", subtitle: "Track your lessons against your subjects and keep moving through your learning path.", stats: "Lessons", next: "Recommended next", progress: "Course progress", journey: "Learning journey", by: "Progress by subject", start: "Continue learning" },
  "beyond-school": { title: "Courses", subtitle: "Keep your modules, learning progress and next steps organised around what you are building.", stats: "Learning", next: "Recommended next", progress: "Course progress", journey: "Learning journey", by: "Progress by course", start: "Continue learning" },
} as const;

export default function ExperienceCurriculum() {
  const { profile, loading: profileLoading } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const copy = COPY[experience.family];
  const [state, setState] = useState<CurriculumState | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (profileLoading) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      const { data: auth } = await createClient().auth.getUser();
      const userId = auth.user?.id;
      try {
        const [curriculumData, learnData] = await withTimeout(
          Promise.all([
            fetch("/api/curriculum").then((res) => res.json()),
            fetch("/api/learn").then((res) => res.json()),
          ]), FETCH_TIMEOUT_MS, "Loading your courses timed out"
        );
        if (!mounted) return;
        const nextState = curriculumData?.state ?? null;
        const nextSubjects = learnData?.subjects ?? [];
        setState(nextState); setSubjects(nextSubjects); setIsCached(false);
        if (userId) saveDashboardCache<CurriculumPayload>(userId, "curriculum", { state: nextState, subjects: nextSubjects });
      } catch (err) {
        const cached = userId ? loadDashboardCache<CurriculumPayload>(userId, "curriculum") : null;
        if (!mounted) return;
        if (cached) { setState(cached.data.state); setSubjects(cached.data.subjects); setIsCached(true); }
        else setError(err instanceof TimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Failed to load your courses");
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [profileLoading, reloadToken]);

  if (profileLoading || loading) return <LoadingState />;
  if (error) return <StateShell title={copy.title}><div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5"><p className="mb-3 text-sm text-red-300">{error}</p><button onClick={() => setReloadToken((n) => n + 1)} className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300">Retry</button></div></StateShell>;

  if (!state || state.allLessons.length === 0) return <StateShell title={copy.title}><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-10 text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]"><BookOpen size={28} /></div><h2 className="text-lg font-bold text-[var(--foreground)]">Nothing mapped yet</h2><p className="mx-auto mb-6 mt-2 max-w-md text-sm text-[var(--muted-foreground)]">Start a lesson and your personalised learning path will begin taking shape here.</p><Link href="/learn" className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-glow)] px-5 py-2.5 text-sm font-semibold text-[var(--primary)]">{copy.start}<ArrowRight size={16} /></Link></div></StateShell>;

  const { recommendedNextLesson, completedLessons, completionPercent, allLessons } = state;
  return <StateShell title={copy.title} subtitle={copy.subtitle}>
    {isCached && <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">Showing saved data. Reconnect to refresh.</div>}
    <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Completion" value={`${completionPercent}%`} icon={<TrendingUp size={18} />} />
      <Stat label="Completed" value={String(completedLessons.length)} icon={<CheckCircle2 size={18} />} />
      <Stat label="Remaining" value={String(allLessons.length - completedLessons.length)} icon={<Lock size={18} />} />
      <Stat label="Total" value={String(allLessons.length)} icon={<BookOpen size={18} />} />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        {recommendedNextLesson && <Recommended lesson={recommendedNextLesson} label={copy.next} action={copy.start} />}
        <section><SectionTitle>{copy.progress}</SectionTitle><CurriculumProgressCard initialState={state} /></section>
      </div>
      <section><SectionTitle>{copy.journey}</SectionTitle><LearningJourney initialState={state} /></section>
    </div>
    <SubjectProgress lessons={allLessons} subjects={subjects} label={copy.by} />
  </StateShell>;
}

function LoadingState() { return <div className="mx-auto max-w-6xl p-6"><div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" /><div className="mt-6 grid gap-4 sm:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}</div></div>; }
function StateShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <div className="min-h-full p-5 sm:p-6"><div className="mx-auto max-w-6xl"><div className="mb-7"><h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">{title}</h1>{subtitle && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>}</div>{children}</div></div>; }
function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="mb-3 text-sm font-bold text-[var(--foreground)]">{children}</h2>; }
function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="mb-2 flex items-center justify-between text-[var(--muted-foreground)]">{icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span></div><div className="text-2xl font-extrabold text-[var(--foreground)]">{value}</div></div>; }
function Recommended({ lesson, label, action }: { lesson: LessonRow; label: string; action: string }) { return <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--surface-2)] p-5"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--primary)]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-glow)]"><Zap size={15} /></span>{label}</div><h3 className="text-lg font-bold text-[var(--foreground)]">{lesson.title}</h3><div className="my-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Clock size={14} /> About 15 min <span>·</span><span className="font-semibold">{lesson.difficulty || "Medium"}</span></div><Link href={`/learn/${lesson.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">{action}<ArrowRight size={15} /></Link></div>; }
function SubjectProgress({ lessons, subjects, label }: { lessons: LessonRow[]; subjects: Subject[]; label: string }) { const names = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]); const groups = useMemo(() => lessons.reduce((a, l) => { const id = l.subject_id; (a[id] ??= { total: 0, done: 0 }).total++; if (l.progress >= 100) a[id].done++; return a; }, {} as Record<string, { total: number; done: number }>), [lessons]); return <section className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-5"><h2 className="mb-4 text-sm font-bold text-[var(--foreground)]">{label}</h2><div className="space-y-4">{Object.entries(groups).map(([id, g]) => { const pct = Math.round((g.done / g.total) * 100); return <div key={id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-[var(--foreground)]">{names[id] || "Subject"}</span><span className="text-[var(--muted-foreground)]">{g.done}/{g.total}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} /></div></div>; })}</div></section>; }
