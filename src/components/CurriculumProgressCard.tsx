"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import type { CurriculumState } from "@/lib/curriculum";

type Props = {
  initialState?: CurriculumState | null;
};

export default function CurriculumProgressCard({ initialState = null }: Props) {
  const [state,   setState]   = useState<CurriculumState | null | undefined>(initialState);
  const [loading, setLoading] = useState(initialState === null);

  useEffect(() => {
    if (initialState !== null) return;
    let mounted = true;
    setLoading(true);
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((data) => { if (mounted) setState(data?.state ?? null); })
      .catch(()   => { if (mounted) setState(null); })
      .finally(()  => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialState]);

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="curriculum-card" style={card}>
      <div style={{ height: 14, width: "45%", borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
      <div style={{ height: 6,  width: "100%", borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} />)}
      </div>
    </div>
  );

  /* ── Empty state ── */
  if (!state) return (
    <div className="curriculum-card" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <BookOpen size={14} color="#475569" />
        <span style={heading}>Curriculum Progress</span>
      </div>
      <p style={muted}>No curriculum data yet. Generate your first lesson to get started.</p>
      <Link href="/learn" style={ghostBtn}>Open Learn</Link>
    </div>
  );

  const percent       = state.completionPercent ?? 0;
  const currentTitle  = state.currentLesson?.title ?? null;
  const recommended   = state.recommendedNextLesson?.title ?? null;
  const completed     = state.completedLessons?.length ?? 0;
  const locked        = state.lockedLessons?.length ?? 0;

  return (
    <div className="curriculum-card" style={card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={13} color="#c4b5fd" />
          </div>
          <span style={heading}>Curriculum Progress</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>{percent}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${percent}%`, borderRadius: 999, background: "linear-gradient(90deg, #7c3aed, #6366f1)", transition: "width .6s ease" }} />
      </div>

      {/* Stats grid */}
      <div className="curriculum-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Stat label="Current lesson"   value={currentTitle ?? "—"} />
        <Stat label="Recommended next" value={recommended  ?? "—"} />
        <Stat label="Completed"        value={String(completed)} accent="#10b981" icon={<CheckCircle2 size={11} color="#10b981" />} />
        <Stat label="Locked"           value={String(locked)}    accent="#475569" icon={<Lock size={11} color="#475569" />} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/curriculum" style={primaryBtn}>Open Curriculum</Link>
        <Link href="/learn"      style={ghostBtn}>View Learn</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="curriculum-stat" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
      <p style={{ fontSize: 10, color: "#475569", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon}
        <p style={{ fontSize: 12, fontWeight: 700, color: accent ?? "#e2e8f0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const card: React.CSSProperties = {
  background: "linear-gradient(160deg, #12122a 0%, #0e0e20 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 20,
  color: "#fff",
};

const cardMobile: React.CSSProperties = {
  ...card,
  padding: 16,
};

const heading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#e2e8f0",
};

const muted: React.CSSProperties = {
  fontSize: 12,
  color: "#475569",
  margin: "0 0 14px",
  lineHeight: 1.6,
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
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  textDecoration: "none",
};
