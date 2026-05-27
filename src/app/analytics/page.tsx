"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamResult {
  id: string;
  subject: string;
  score: number;
  total: number;
  created_at: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  xp_earned: number;
  created_at: string;
}

interface AnalyticsData {
  examResults: ExamResult[];
  focusSessions: FocusSession[];
  totalFocusMinutes: number;
  totalXpEarned: number;
  averageScore: number | null;
  completedExams: number;
}

type PageState = "loading" | "empty" | "error" | "data";

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse ${className}`}
    >
      <div className="h-3 w-24 rounded bg-white/10 mb-4" />
      <div className="h-8 w-16 rounded bg-white/10 mb-2" />
      <div className="h-3 w-32 rounded bg-white/10" />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart placeholder */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-3 w-28 rounded bg-white/10 mb-6" />
        <div className="flex items-end gap-2 h-28">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-white/10"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* List placeholder */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-white/10 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-white/10" />
              <div className="h-2.5 w-1/2 rounded bg-white/10" />
            </div>
            <div className="h-5 w-10 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function AnalyticsEmptyState() {
  const steps = [
    {
      icon: "⏱",
      label: "Run a Focus session",
      sub: "Complete at least one Pomodoro session",
      href: "/focus",
    },
    {
      icon: "✅",
      label: "Complete tasks",
      sub: "Mark tasks done to log activity",
      href: "/tasks",
    },
    {
      icon: "🎯",
      label: "Take an Exam Sim",
      sub: "Sit a timed exam to generate results",
      href: "/exam-sim",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Pulse ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
        <div className="relative h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl">
          📊
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">
        No analytics yet
      </h2>
      <p className="text-sm text-white/50 max-w-xs mb-10">
        Cortex is watching. Start studying and your patterns will appear here
        automatically.
      </p>

      {/* Action steps */}
      <div className="w-full max-w-sm space-y-3 text-left">
        {steps.map(({ icon, label, sub, href }) => (
          
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 hover:border-indigo-500/40 transition-all duration-200 group"
          >
            <span className="text-xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                {label}
              </p>
              <p className="text-xs text-white/40 truncate">{sub}</p>
            </div>
            <span className="text-white/30 group-hover:text-indigo-400 transition-colors text-lg">
              →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function AnalyticsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mb-6">
        ⚠️
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Couldn't load analytics
      </h2>
      <p className="text-sm text-white/50 max-w-xs mb-8">
        This could be a connection issue. Your data is safe — try again when
        you're back online.
      </p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium px-6 py-2.5 transition-colors duration-150"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-1">
      <span className="text-lg">{icon}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs font-medium text-white/60">{label}</span>
      {sub && <span className="text-xs text-white/30">{sub}</span>}
    </div>
  );
}

// ─── Exam Results Table ───────────────────────────────────────────────────────

function ExamResultsSection({ results }: { results: ExamResult[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
          Exam Results
        </p>
        <p className="text-sm text-white/30 text-center py-6">
          No exam simulations completed yet.{" "}
          <a href="/exam-sim" className="text-indigo-400 hover:underline">
            Start one →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
        Recent Exam Results
      </p>
      <div className="space-y-2">
        {results.slice(0, 6).map((r) => {
          const pct = Math.round((r.score / r.total) * 100);
          const color =
            pct >= 70
              ? "bg-emerald-500/80"
              : pct >= 50
              ? "bg-amber-500/80"
              : "bg-red-500/80";
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {r.subject}
                </p>
                <p className="text-xs text-white/40">
                  {new Date(r.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {/* Score bar */}
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-white/80 w-9 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Focus Sessions Chart ─────────────────────────────────────────────────────

function FocusSessionsSection({ sessions }: { sessions: FocusSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
          Focus Sessions
        </p>
        <p className="text-sm text-white/30 text-center py-6">
          No sessions logged yet.{" "}
          <a href="/focus" className="text-indigo-400 hover:underline">
            Start focusing →
          </a>
        </p>
      </div>
    );
  }

  // Last 7 sessions for the bar chart
  const recent = sessions.slice(-7);
  const maxMin = Math.max(...recent.map((s) => s.duration_minutes), 1);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
        Focus Sessions
      </p>
      <p className="text-xs text-white/30 mb-5">Last {recent.length} sessions</p>
      <div className="flex items-end gap-1.5 h-24">
        {recent.map((s, i) => {
          const heightPct = (s.duration_minutes / maxMin) * 100;
          return (
            <div
              key={s.id}
              className="flex-1 flex flex-col items-center justify-end gap-1 group"
            >
              <div
                className="w-full rounded-t-md bg-indigo-500/60 group-hover:bg-indigo-400/80 transition-all"
                style={{ height: `${Math.max(heightPct, 4)}%` }}
                title={`${s.duration_minutes}m`}
              />
              <span className="text-xs text-white/20 group-hover:text-white/50 transition-colors">
                {s.duration_minutes}m
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [fetchKey, setFetchKey] = useState(0); // increment to retry

  useEffect(() => {
    let cancelled = false;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchAnalytics = async () => {
      setPageState("loading");

      // Hard timeout — if we haven't resolved in FETCH_TIMEOUT_MS, show error
      const timeoutId = setTimeout(() => {
        if (!cancelled) setPageState("error");
      }, FETCH_TIMEOUT_MS);

      try {
        // Verify auth first — no point querying if not logged in
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Not authenticated — treat as empty rather than error
          clearTimeout(timeoutId);
          if (!cancelled) setPageState("empty");
          return;
        }

        // Parallel fetch — both queries fire simultaneously
        const [examRes, focusRes] = await Promise.all([
          supabase
            .from("exam_results")
            .select("id, subject, score, total, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),

          supabase
            .from("focus_sessions")
            .select("id, duration_minutes, xp_earned, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        clearTimeout(timeoutId);
        if (cancelled) return;

        // Surface the first Supabase-level error
        if (examRes.error) throw examRes.error;
        if (focusRes.error) throw focusRes.error;

        const examResults: ExamResult[] = examRes.data ?? [];
        const focusSessions: FocusSession[] = focusRes.data ?? [];

        const totalFocusMinutes = focusSessions.reduce(
          (sum, s) => sum + (s.duration_minutes ?? 0),
          0
        );
        const totalXpEarned = focusSessions.reduce(
          (sum, s) => sum + (s.xp_earned ?? 0),
          0
        );
        const averageScore =
          examResults.length > 0
            ? Math.round(
                examResults.reduce(
                  (sum, r) => sum + (r.score / r.total) * 100,
                  0
                ) / examResults.length
              )
            : null;

        const hasAnyData =
          examResults.length > 0 || focusSessions.length > 0;

        setAnalytics({
          examResults,
          focusSessions,
          totalFocusMinutes,
          totalXpEarned,
          averageScore,
          completedExams: examResults.length,
        });

        setPageState(hasAnyData ? "data" : "empty");
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.error("[Analytics] fetch failed:", err);
          setPageState("error");
        }
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const handleRetry = () => setFetchKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Header — always visible */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Analytics
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Cortex tracks your patterns. Here's what it sees.
          </p>
        </div>

        {/* State router */}
        {pageState === "loading" && <AnalyticsSkeleton />}

        {pageState === "error" && (
          <AnalyticsErrorState onRetry={handleRetry} />
        )}

        {pageState === "empty" && <AnalyticsEmptyState />}

        {pageState === "data" && analytics && (
          <div className="space-y-4">
            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon="⏱"
                label="Focus minutes"
                value={analytics.totalFocusMinutes}
                sub="all time"
              />
              <StatCard
                icon="⚡"
                label="XP from focus"
                value={analytics.totalXpEarned}
              />
              <StatCard
                icon="🎯"
                label="Exams taken"
                value={analytics.completedExams}
              />
              <StatCard
                icon="📈"
                label="Avg score"
                value={
                  analytics.averageScore !== null
                    ? `${analytics.averageScore}%`
                    : "—"
                }
                sub={
                  analytics.averageScore !== null
                    ? analytics.averageScore >= 70
                      ? "Strong"
                      : analytics.averageScore >= 50
                      ? "Building"
                      : "Keep pushing"
                    : "No exams yet"
                }
              />
            </div>

            {/* Focus chart */}
            <FocusSessionsSection sessions={analytics.focusSessions} />

            {/* Exam results */}
            <ExamResultsSection results={analytics.examResults} />
          </div>
        )}
      </div>
    </div>
  );
}
