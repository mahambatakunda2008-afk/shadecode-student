"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Target, Clock, AlertCircle } from "lucide-react";
import { detectWeakAreas, WeakArea, WeakAreaAnalysis } from "@/lib/analytics/weakAreaDetector";
import { createClient } from "@/lib/supabase/client";

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  weak_areas: string[];
  time_taken: number;
  created_at: string;
}

interface Lesson {
  id: string;
  subject_id: string;
  title: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export default function WeakAreasPanel() {
  const [analysis, setAnalysis] = useState<WeakAreaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [examResultsData, lessonsData] = await Promise.all([
          supabase
            .from("exam_results")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("learn_lessons")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(100),
        ]);

        const analysis = detectWeakAreas(
          examResultsData.data || [],
          lessonsData.data || []
        );

        setAnalysis(analysis);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load weak areas:", err);
        setError(true);
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
        <div style={{ height: 40, borderRadius: 8, background: "var(--muted)", animation: "dash-pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  if (error || !analysis) {
    return null;
  }

  const { weakAreas, priorityRevisionList, riskIndicators, summary } = analysis;

  if (weakAreas.length === 0) {
    return (
      <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color="#22c55e" />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#22c55e", margin: 0 }}>
              Strong Performance
            </p>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0 }}>
              No weak areas detected
            </p>
          </div>
        </div>
        <p style={{ fontSize: "12", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
          {summary}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={16} color="var(--danger)" />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--danger)", margin: 0 }}>
              Weak Areas
            </p>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0 }}>
              Learning analytics
            </p>
          </div>
        </div>
        <RiskIndicatorBadge riskIndicators={riskIndicators} />
      </div>

      {/* Summary */}
      <p style={{ fontSize: "12", color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
        {summary}
      </p>

      {/* Risk Indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <RiskBadge level="high" count={riskIndicators.highRisk} />
        <RiskBadge level="medium" count={riskIndicators.mediumRisk} />
        <RiskBadge level="low" count={riskIndicators.lowRisk} />
      </div>

      {/* Priority Revision List */}
      {priorityRevisionList.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8 }}>
            Priority Revision List
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {priorityRevisionList.map((area, index) => (
              <WeakAreaCard key={`${area.subject}:${area.topic}`} area={area} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {/* All Weak Areas (collapsed by default) */}
      {weakAreas.length > 5 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: "12", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
            View all {weakAreas.length} weak areas
          </summary>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {weakAreas.slice(5).map((area, index) => (
              <WeakAreaCard key={`${area.subject}:${area.topic}`} area={area} rank={index + 6} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function RiskIndicatorBadge({ riskIndicators }: { riskIndicators: { highRisk: number; mediumRisk: number; lowRisk: number } }) {
  const total = riskIndicators.highRisk + riskIndicators.mediumRisk + riskIndicators.lowRisk;
  if (total === 0) return null;

  let color = "#22c55e";
  let label = "Low Risk";
  if (riskIndicators.highRisk > 0) {
    color = "#f87171";
    label = "High Risk";
  } else if (riskIndicators.mediumRisk > 0) {
    color = "#f59e0b";
    label = "Medium Risk";
  }

  return (
    <div style={{ padding: "4px 10px", borderRadius: "20px", background: `${color}15`, border: `1px solid ${color}30` }}>
      <p style={{ fontSize: "10px", fontWeight: 700, color, margin: 0 }}>{label}</p>
    </div>
  );
}

function RiskBadge({ level, count }: { level: "high" | "medium" | "low"; count: number }) {
  if (count === 0) return null;

  const colors = {
    high: "#f87171",
    medium: "#f59e0b",
    low: "#22c55e",
  };

  const icons = {
    high: <AlertCircle size={10} color={colors.high} />,
    medium: <AlertTriangle size={10} color={colors.medium} />,
    low: <Target size={10} color={colors.low} />,
  };

  return (
    <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: `${colors[level]}10`, border: `1px solid ${colors[level]}20`, display: "flex", alignItems: "center", gap: 6 }}>
      {icons[level]}
      <div>
        <p style={{ fontSize: "14", fontWeight: 700, color: colors[level], margin: 0 }}>{count}</p>
        <p style={{ fontSize: "9px", color: "var(--muted-foreground)", margin: 0, textTransform: "capitalize" }}>{level} risk</p>
      </div>
    </div>
  );
}

function WeakAreaCard({ area, rank }: { area: WeakArea; rank: number }) {
  const riskColors = {
    high: "#f87171",
    medium: "#f59e0b",
    low: "#22c55e",
  };

  const color = riskColors[area.riskLevel];

  return (
    <div style={{ padding: 12, borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <p style={{ fontSize: "10", fontWeight: 700, color: "white", margin: 0 }}>{rank}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13", fontWeight: 600, margin: 0 }}>{area.topic}</p>
          <p style={{ fontSize: "11", color: "var(--muted-foreground)", margin: "2px 0 0" }}>{area.subject}</p>
        </div>
        <div style={{ padding: "2px 8px", borderRadius: "20px", background: `${color}15`, border: `1px solid ${color}30` }}>
          <p style={{ fontSize: "10", fontWeight: 700, color, margin: 0, textTransform: "capitalize" }}>{area.riskLevel}</p>
        </div>
      </div>

      {/* Reasons */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: "10", color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4 }}>Why flagged:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {area.reasons.slice(0, 3).map((reason, i) => (
            <span key={i} style={{ fontSize: "10", padding: "2px 6px", borderRadius: "4px", background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {reason.split(":")[0].replace("_", " ")}
            </span>
          ))}
          {area.reasons.length > 3 && (
            <span style={{ fontSize: "10", color: "var(--muted-foreground)" }}>+{area.reasons.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ padding: 8, borderRadius: 6, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Target size={12} color="#6366f1" />
          <p style={{ fontSize: "10", fontWeight: 600, color: "#6366f1", margin: 0 }}>Recommendation</p>
        </div>
        <p style={{ fontSize: "11", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.4 }}>
          {area.recommendation}
        </p>
      </div>
    </div>
  );
}
