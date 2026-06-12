"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, CheckCircle2, Lock, TrendingUp, Clock, Zap } from "lucide-react";
import CurriculumProgressCard from "@/components/CurriculumProgressCard";
import LearningJourney from "@/components/LearningJourney";
import type { CurriculumState, LessonRow } from "@/lib/curriculum";

export default function CurriculumPage() {
  const [state, setState] = useState<CurriculumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/curriculum")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setState(data?.state ?? null);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load curriculum");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ height: 28, width: "30%", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ height: 200, borderRadius: 18, background: "rgba(255,255,255,0.03)" }} />
            <div style={{ height: 200, borderRadius: 18, background: "rgba(255,255,255,0.03)" }} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Curriculum</h1>
          <div style={{ padding: 20, borderRadius: 18, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (!state || state.allLessons.length === 0) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Curriculum</h1>
          <div style={{ padding: 40, borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <BookOpen size={32} color="#a78bfa" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>No curriculum yet</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Generate your first lesson to start building your personalized learning path.
            </p>
            <Link
              href="/learn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                fontSize: 14,
                fontWeight: 600,
                color: "#c4b5fd",
                textDecoration: "none",
              }}
            >
              Start Learning
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { currentLesson, recommendedNextLesson, completedLessons, lockedLessons, completionPercent, allLessons } = state;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Curriculum</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Track your learning progress and see your recommended path
          </p>
        </div>

        {/* Overview Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard
            label="Completion"
            value={`${completionPercent}%`}
            icon={<TrendingUp size={20} color="#10b981" />}
            accent="#10b981"
          />
          <StatCard
            label="Completed"
            value={String(completedLessons.length)}
            icon={<CheckCircle2 size={20} color="#10b981" />}
            accent="#10b981"
          />
          <StatCard
            label="Remaining"
            value={String(allLessons.length - completedLessons.length)}
            icon={<Lock size={20} color="#64748b" />}
            accent="#64748b"
          />
          <StatCard
            label="Total Lessons"
            value={String(allLessons.length)}
            icon={<BookOpen size={20} color="#a78bfa" />}
            accent="#a78bfa"
          />
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Recommended Next Lesson */}
            {recommendedNextLesson && (
              <RecommendedLessonCard lesson={recommendedNextLesson} />
            )}

            {/* Curriculum Progress */}
            <CurriculumProgressCard initialState={state} />
          </div>

          {/* Right Column */}
          <div>
            {/* Learning Journey */}
            <LearningJourney initialState={state} />
          </div>
        </div>

        {/* Progress by Subject */}
        <SubjectProgressSection lessons={allLessons} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div style={{ padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        {icon}
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
    </div>
  );
}

function RecommendedLessonCard({ lesson }: { lesson: LessonRow }) {
  return (
    <div style={{ padding: 24, borderRadius: 18, background: "linear-gradient(160deg, #12122a 0%, #0e0e20 100%)", border: "1px solid rgba(139,92,246,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={16} color="#c4b5fd" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>Recommended Next</span>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>{lesson.title}</h3>
      
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} color="#64748b" />
          <span style={{ fontSize: 12, color: "#64748b" }}>~15 min</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: lesson.difficulty === "hard" ? "#f87171" : lesson.difficulty === "medium" ? "#fbbf24" : "#10b981" }}>
            {lesson.difficulty || "Medium"}
          </span>
        </div>
      </div>

      <Link
        href={`/learn/${lesson.id}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 10,
          background: "rgba(139,92,246,0.15)",
          border: "1px solid rgba(139,92,246,0.3)",
          fontSize: 14,
          fontWeight: 600,
          color: "#c4b5fd",
          textDecoration: "none",
        }}
      >
        Continue Learning
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function SubjectProgressSection({ lessons }: { lessons: LessonRow[] }) {
  // Group lessons by subject_id
  const subjectGroups = lessons.reduce((acc, lesson) => {
    const subjectId = lesson.subject_id;
    if (!acc[subjectId]) {
      acc[subjectId] = { lessons: [], completed: 0 };
    }
    acc[subjectId].lessons.push(lesson);
    if (lesson.progress >= 100) acc[subjectId].completed++;
    return acc;
  }, {} as Record<string, { lessons: LessonRow[]; completed: number }>);

  return (
    <div style={{ padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Progress by Subject</h3>
      
      {Object.keys(subjectGroups).length === 0 ? (
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>No subject data available</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(subjectGroups).map(([subjectId, data]) => {
            const percent = Math.round((data.completed / data.lessons.length) * 100);
            return (
              <div key={subjectId}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Subject {subjectId}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{percent}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${percent}%`, borderRadius: 999, background: "linear-gradient(90deg, #7c3aed, #6366f1)", transition: "width 0.5s ease" }} />
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
                  {data.completed} of {data.lessons.length} lessons completed
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
