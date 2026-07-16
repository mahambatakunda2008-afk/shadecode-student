"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Lock, Dot, Star, Trophy } from "lucide-react";
import type { CurriculumState, LessonRow } from "@/lib/curriculum";

type Props = {
  initialState?: CurriculumState | null;
};

export default function LearningJourney({ initialState = null }: Props) {
  const [state,   setState]   = useState<CurriculumState | null | undefined>(initialState);
  const [loading, setLoading] = useState(initialState === null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialState !== null) return;
    let mounted = true;
    setLoading(true);
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((d) => { if (mounted) setState(d?.state ?? null); })
      .catch(()  => { if (mounted) setState(null); })
      .finally(()  => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialState]);

  /* ── Loading skeleton ── */
  if (loading) return (
    <div style={card}>
      <div style={{ height: 14, width: "40%", borderRadius: 6, background: "var(--card-border)", marginBottom: 16 }} />
      <div style={{ height: 6, width: "100%", borderRadius: 999, background: "var(--card-border)", marginBottom: 18 }} />
      {[0,1,2,3].map(i => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--card-border)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 11, width: "70%", borderRadius: 4, background: "var(--card-border)", marginBottom: 5 }} />
            <div style={{ height: 9, width: "40%", borderRadius: 4, background: "var(--card-border)" }} />
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Empty state ── */
  if (!state) return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Trophy size={13} color="var(--muted-foreground)" />
        <span style={headingStyle}>Learning Journey</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px", lineHeight: 1.6 }}>
        No curriculum found. Start learning to build your journey.
      </p>
      <Link href="/learn" style={primaryBtn}>Open Learn</Link>
    </div>
  );

  const lessons: LessonRow[] = state.allLessons ?? [];
  const completedIds  = new Set(state.completedLessons?.map((l) => l.id) ?? []);
  const lockedIds     = new Set(state.lockedLessons?.map((l) => l.id) ?? []);
  const currentId     = state.currentLesson?.id ?? null;
  const recommendedId = state.recommendedNextLesson?.id ?? null;
  const completion    = state.completionPercent ?? 0;

  const milestones = [25, 50, 75, 100];

  /* Show 6 lessons collapsed, all when expanded */
  const COLLAPSE_AT = 6;
  const visibleLessons = expanded ? lessons : lessons.slice(0, COLLAPSE_AT);
  const hasMore = lessons.length > COLLAPSE_AT;

  return (
    <div style={card}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={13} color="#fbbf24" />
          </div>
          <span style={headingStyle}>Learning Journey</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{completion}%</span>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 5, borderRadius: 999, background: "var(--card-border)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${completion}%`, borderRadius: 999, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", transition: "width .6s ease" }} />
      </div>

      {/* ── Milestone pills ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {milestones.map(m => {
          const reached = completion >= m;
          return (
            <div key={m} style={{ flex: 1, textAlign: "center", padding: "5px 0", borderRadius: 8, background: reached ? "rgba(16,185,129,0.12)" : "var(--card-border)", border: `1px solid ${reached ? "rgba(16,185,129,0.25)" : "var(--card-border)"}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, margin: 0, color: reached ? "#6ee7b7" : "var(--muted-foreground)" }}>{m}%</p>
            </div>
          );
        })}
      </div>

      {/* ── Timeline ── */}
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", left: 13, top: 8, bottom: 8, width: 1, background: "var(--card-border)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {lessons.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", paddingLeft: 36 }}>No lessons in curriculum yet.</p>
          )}

          {visibleLessons.map((lesson, i) => {
            const isCompleted   = completedIds.has(lesson.id);
            const isLocked      = lockedIds.has(lesson.id);
            const isCurrent     = currentId === lesson.id;
            const isRecommended = recommendedId === lesson.id;

            /* dot style */
            let dotBg     = "var(--card-border)";
            let dotBorder = "var(--card-border)";
            let dotContent: React.ReactNode = <Circle size={8} color="var(--muted-foreground)" />;

            if (isCompleted) {
              dotBg     = "rgba(16,185,129,0.2)";
              dotBorder = "rgba(16,185,129,0.4)";
              dotContent = <CheckCircle2 size={11} color="#10b981" />;
            } else if (isCurrent) {
              dotBg     = "rgba(139,92,246,0.25)";
              dotBorder = "rgba(139,92,246,0.5)";
              dotContent = <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} />;
            } else if (isRecommended && !isCompleted) {
              dotBg     = "rgba(245,158,11,0.2)";
              dotBorder = "rgba(245,158,11,0.4)";
              dotContent = <Star size={10} color="#f59e0b" />;
            } else if (isLocked) {
              dotBg     = "var(--card-border)";
              dotBorder = "var(--card-border)";
              dotContent = <Lock size={9} color="var(--surface)" />;
            }

            /* label */
            let statusLabel   = "Upcoming";
            let statusColor   = "var(--muted-foreground)";
            if (isCompleted)   { statusLabel = "Completed";    statusColor = "#10b981"; }
            else if (isCurrent)    { statusLabel = "In progress";  statusColor = "#a78bfa"; }
            else if (isRecommended){ statusLabel = "Next up";      statusColor = "#f59e0b"; }
            else if (isLocked)     { statusLabel = "Locked";       statusColor = "var(--surface)"; }

            return (
              <div
                key={lesson.id}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < visibleLessons.length - 1 ? 14 : 0, opacity: isLocked ? 0.45 : 1 }}
              >
                {/* Dot */}
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: dotBg, border: `1px solid ${dotBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, marginTop: 1 }}>
                  {dotContent}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: isCompleted ? "var(--muted-foreground)" : isCurrent ? "var(--foreground)" : "var(--muted-foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lesson.title}
                  </p>
                  <p style={{ fontSize: 10, color: statusColor, margin: "2px 0 0", fontWeight: 600 }}>{statusLabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand / collapse */}
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ marginTop: 12, width: "100%", padding: "7px 0", borderRadius: 10, background: "var(--card-border)", border: "1px solid var(--card-border)", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", cursor: "pointer" }}
          >
            {expanded ? "Show less" : `Show ${lessons.length - COLLAPSE_AT} more`}
          </button>
        )}
      </div>

      {/* ── Footer links ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Link href="/learn"       style={primaryBtn}>Open Learn</Link>
        <Link href="/curriculum"  style={ghostBtn}>See Curriculum</Link>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const card: React.CSSProperties = {
  background: "linear-gradient(160deg, #12122a 0%, #0e0e20 100%)",
  border: "1px solid var(--card-border)",
  borderRadius: 18,
  padding: 20,
  color: "#fff",
};

const headingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--card-border)",
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 0",
  borderRadius: 10,
  background: "rgba(139,92,246,0.15)",
  border: "1px solid rgba(139,92,246,0.3)",
  fontSize: 12,
  fontWeight: 600,
  color: "#c4b5fd",
  textDecoration: "none",
};

const ghostBtn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 0",
  borderRadius: 10,
  background: "var(--card-border)",
  border: "1px solid var(--card-border)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  textDecoration: "none",
};
