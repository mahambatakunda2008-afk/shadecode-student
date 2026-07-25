"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, Target, Sparkles } from "lucide-react";

interface Summary {
  weak_subjects: string[];
  strong_subjects: string[];
  exam_scores: { subject: string; score: number; recorded_at: string }[];
  average_exam_score: number;
  last_study_date: string | null;
}

export default function WeakTopicsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/exam-hub/cortex-summary")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSummary(data.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const hasData = summary && summary.exam_scores.length > 0;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/exam-hub"
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", textDecoration: "none", marginBottom: 16, fontSize: 13, width: "fit-content" }}
        >
          <ArrowLeft size={16} /> Exam Hub
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Target size={20} color="var(--danger)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Weak Topics</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          Based on scores from completed past papers.
        </p>

        {error && (
          <div style={{ padding: 16, borderRadius: 14, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 20 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ height: 200, borderRadius: 18, background: "var(--surface-2)" }} />
        ) : !hasData ? (
          <div style={{ padding: 40, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
            <Sparkles size={32} color="var(--muted-foreground)" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
              Not enough data yet
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>
              Complete a few past papers with a score and this page fills in automatically.
            </p>
            <Link
              href="/exam-hub/papers"
              style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Browse Past Papers
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ padding: 18, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--foreground)" }}>
                {Math.round(summary!.average_exam_score)}%
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                average across {summary!.exam_scores.length} completed paper{summary!.exam_scores.length === 1 ? "" : "s"}
              </div>
            </div>

            {summary!.weak_subjects.length > 0 && (
              <SubjectSection
                title="Focus on these"
                icon={TrendingDown}
                accent="var(--danger)"
                subjects={summary!.weak_subjects}
              />
            )}

            {summary!.strong_subjects.length > 0 && (
              <SubjectSection
                title="You're strong here"
                icon={TrendingUp}
                accent="var(--accent)"
                subjects={summary!.strong_subjects}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectSection({
  title,
  icon: Icon,
  accent,
  subjects,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  subjects: string[];
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={16} color={accent} />
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {subjects.map((subject) => (
          <Link
            key={subject}
            href="/exam-hub/papers"
            style={{
              padding: "8px 14px", borderRadius: 999,
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
              color: accent, fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            {subject}
          </Link>
        ))}
      </div>
    </div>
  );
}
