"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpenCheck,
  Flame,
  GraduationCap,
  RefreshCcw,
  Sparkles,
  Trophy,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import LessonCard from "./components/LessonCard";
import ProgressBar from "./components/ProgressBar";
import SubjectTabs from "./components/SubjectTabs";
import type { LearnLesson, LearnListResponse, LearnSubject } from "./types";

const EMPTY_SUMMARY = {
  currentXP: 0,
  currentStreak: 0,
  level: 1,
  xpGoal: 100,
};
const EMPTY_LESSONS: LearnLesson[] = [];
const EMPTY_SUBJECTS: LearnSubject[] = [];

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function LessonGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="min-h-[220px] animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={index}
        >
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-lg bg-slate-100" />
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
          <div className="mt-5 h-3 w-20 rounded bg-slate-100" />
          <div className="mt-3 h-5 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
          <div className="mt-8 h-2 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function LearnPageClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [data, setData] = useState<LearnListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      if (!cancelled) {
        setAccessToken(session.access_token);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const fetchLearnData = useCallback(
    async (subjectId: string) => {
      if (!accessToken) return;

      const initialLoad = !hasLoadedRef.current;

      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({ subjectId });
        const response = await fetch(`/api/learn?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status === 401) {
          router.push("/auth/login");
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || "Unable to load lessons.");
        }

        const payload = (await response.json()) as LearnListResponse;
        setData(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load lessons.";
        setError(message);
      } finally {
        hasLoadedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, router]
  );

  useEffect(() => {
    if (!accessToken) return;
    void Promise.resolve().then(() => fetchLearnData(selectedSubjectId));
  }, [accessToken, fetchLearnData, selectedSubjectId]);

  const summary = data?.summary ?? EMPTY_SUMMARY;
  const lessons = data?.lessons ?? EMPTY_LESSONS;
  const subjects = data?.subjects ?? EMPTY_SUBJECTS;
  const xpGoal = Math.max(1, summary.xpGoal || summary.level * 100);
  const xpPercent = clampProgress((summary.currentXP / xpGoal) * 100);
  const remainingXP = Math.max(0, xpGoal - summary.currentXP);
  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const averageProgress = lessons.length
    ? Math.round(
        lessons.reduce((total, lesson) => total + lesson.progress, 0) /
          lessons.length
      )
    : 0;
  const selectedSubjectName = useMemo(() => {
    if (selectedSubjectId === "all") return "All";
    return (
      subjects.find((subject) => subject.id === selectedSubjectId)?.name ??
      "Subject"
    );
  }, [selectedSubjectId, subjects]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">
              Shadecode Student
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Learn
            </h1>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            {completedCount}/{lessons.length} completed
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm shadow-orange-100/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Current Streak
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {summary.currentStreak} days
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-sky-100 bg-white/90 p-4 shadow-sm shadow-sky-100/70 md:col-span-2">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  XP Progress
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {summary.currentXP.toLocaleString()} XP
                </p>
              </div>
              <div className="rounded-lg bg-sky-50 px-3 py-2 text-right text-xs font-bold text-sky-700">
                {remainingXP.toLocaleString()} to goal
              </div>
            </div>
            <ProgressBar label="XP Progress" value={xpPercent} />
            <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Level {summary.level}</span>
              <span>{xpGoal.toLocaleString()} XP</span>
            </div>
          </article>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-white/85 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Average</p>
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black">{averageProgress}%</p>
            <ProgressBar
              className="mt-3"
              label="Average lesson progress"
              value={averageProgress}
            />
          </article>

          <article className="rounded-lg border border-slate-200 bg-white/85 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Subjects</p>
              <GraduationCap className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="mt-2 text-2xl font-black">{subjects.length}</p>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {subjects.reduce(
                (total, subject) => total + subject.lessonCount,
                0
              )}{" "}
              lessons saved
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white/85 p-4 shadow-sm sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Today</p>
              <BookOpenCheck className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-2 text-2xl font-black">
              {lessons.length}{" "}
              {selectedSubjectId === "all" ? "lessons" : selectedSubjectName}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Pick a card to continue from your saved progress.
            </p>
          </article>
        </div>

        <SubjectTabs
          isLoading={refreshing}
          onSelect={setSelectedSubjectId}
          selectedSubjectId={selectedSubjectId}
          subjects={subjects}
        />

        <section className="rounded-lg border border-slate-200 bg-white/70 p-3 shadow-sm backdrop-blur">
          <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {selectedSubjectName} Lessons
              </h2>
              <p className="text-sm font-medium text-slate-500">
                {lessons.length} available
              </p>
            </div>

            {refreshing && (
              <div className="text-sm font-semibold text-sky-600">
                Updating...
              </div>
            )}
          </div>

          {error && (
            <div className="mb-3 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                onClick={() => fetchLearnData(selectedSubjectId)}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {loading ? (
              <LessonGridSkeleton />
            ) : lessons.length > 0 ? (
              <div
                className={`grid gap-3 transition-opacity duration-300 md:grid-cols-2 xl:grid-cols-3 ${
                  refreshing ? "opacity-60" : "opacity-100"
                }`}
              >
                {lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                <div>
                  <p className="text-lg font-black text-slate-900">
                    No lessons found
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Save lessons for this subject and they will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
