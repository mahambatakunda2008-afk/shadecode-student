"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import ProgressBar from "../components/ProgressBar";
import type { LearnDetailResponse, LearnLesson } from "../types";

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function difficultyClasses(difficulty: LearnLesson["difficulty"]) {
  if (difficulty === "hard") {
    return {
      pill: "bg-rose-50 text-rose-700 ring-rose-200",
      fill: "from-rose-400 to-red-500",
    };
  }

  if (difficulty === "medium") {
    return {
      pill: "bg-amber-50 text-amber-700 ring-amber-200",
      fill: "from-amber-400 to-orange-500",
    };
  }

  return {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    fill: "from-emerald-400 to-teal-500",
  };
}

export default function LearnLessonDetail() {
  const params = useParams();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const lessonId = useMemo(
    () => normalizeParam(params.lessonId),
    [params.lessonId]
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LearnLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchLesson = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ lessonId });
        const response = await fetch(`/api/learn?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
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
          throw new Error(payload?.error || "Unable to load lesson.");
        }

        const payload = (await response.json()) as LearnDetailResponse;
        setLesson(payload.lesson);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load lesson.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [lessonId, router]
  );

  useEffect(() => {
    if (!accessToken || !lessonId) return;
    void Promise.resolve().then(() => fetchLesson(accessToken));
  }, [accessToken, fetchLesson, lessonId]);

  const styles = lesson ? difficultyClasses(lesson.difficulty) : null;

  return (
    <section className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          href="/learn"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learn
        </Link>

        {loading ? (
          <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-slate-100" />
            <div className="mt-6 h-4 w-28 rounded bg-slate-100" />
            <div className="mt-4 h-8 w-3/4 rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
            <div className="mt-8 h-2 rounded-full bg-slate-100" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="font-bold">{error}</p>
            </div>
            {accessToken && (
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                onClick={() => fetchLesson(accessToken)}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry
              </button>
            )}
          </div>
        ) : lesson && styles ? (
          <article className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-sky-100">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400" />

            {lesson.completed && (
              <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}

            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <BookOpenCheck className="h-6 w-6" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
                {lesson.subject}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${styles.pill}`}
              >
                {lesson.difficulty}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="mt-4 text-base font-medium leading-7 text-slate-600">
              {lesson.description || "No description has been added yet."}
            </p>

            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
                <span>{lesson.completed ? "Completed" : "Progress"}</span>
                <span>{lesson.progress}%</span>
              </div>
              <ProgressBar
                fillClassName={
                  lesson.completed ? "from-emerald-400 to-green-500" : styles.fill
                }
                label="Lesson progress"
                value={lesson.progress}
              />
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
