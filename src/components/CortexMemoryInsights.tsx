"use client";

import { useEffect, useState } from "react";
import { Brain, TrendingUp, Clock, Target, Flame } from "lucide-react";

interface CortexMemory {
  streak: number;
  longestStreak: number;
  totalStudySessions: number;
  totalStudyTimeMinutes: number;
  averageSessionDuration: number;
  totalLessonsCompleted: number;
  frequentlyStudiedSubjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  preferredStudyHours: number[];
  averageExamScore: number;
  lastStudyDate: string | null;
}

interface CortexInsights {
  learning: string;
  recommendation: string;
}

interface MemoryResponse {
  memory: CortexMemory;
  insights: CortexInsights;
}

export default function CortexMemoryInsights() {
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cortex/memory");
        const json = await res.json();
        if (res.ok) setData(json);
      } catch (err) {
        console.error("Failed to load Cortex memory:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
        <div style={{ height: 40, borderRadius: 8, background: "var(--muted)", animation: "dash-pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { memory, insights } = data;
  const studyHours = Math.round(memory.totalStudyTimeMinutes / 60);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Brain size={16} color="#6366f1" />
        </div>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", margin: 0 }}>
            Cortex Memory
          </p>
          <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0 }}>
            Long-term learning patterns
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard icon={<Flame size={14} color="#f97316" />} label="Current Streak" value={String(memory.streak)} />
        <StatCard icon={<TrendingUp size={14} color="#10b981" />} label="Best Streak" value={String(memory.longestStreak)} />
        <StatCard icon={<Clock size={14} color="#6366f1" />} label="Study Time" value={`${studyHours}h`} />
        <StatCard icon={<Target size={14} color="#8b5cf6" />} label="Sessions" value={String(memory.totalStudySessions)} />
      </div>

      {/* Subject Mastery */}
      {(memory.strongSubjects?.length > 0 || memory.weakSubjects?.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8 }}>Subject Mastery</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {memory.strongSubjects?.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                <p style={{ fontSize: "12", margin: 0 }}>Strong: {memory.strongSubjects.join(", ")}</p>
              </div>
            )}
            {memory.weakSubjects?.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                <p style={{ fontSize: "12", margin: 0 }}>Focus: {memory.weakSubjects.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)", borderRadius: 8, padding: 12 }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#6366f1", marginBottom: 6 }}>Learning Insight</p>
        <p style={{ fontSize: "12", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
          {insights.learning}
        </p>
        {insights.recommendation && (
          <>
            <div style={{ height: 1, background: "rgba(99,102,241,0.1)", margin: "10px 0" }} />
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#6366f1", marginBottom: 6 }}>Recommendation</p>
            <p style={{ fontSize: "12", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
              {insights.recommendation}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "14", fontWeight: 700, margin: 0 }}>{value}</p>
        <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0 }}>{label}</p>
      </div>
    </div>
  );
}
