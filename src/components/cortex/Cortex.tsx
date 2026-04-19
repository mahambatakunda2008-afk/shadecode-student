"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CortexProps {
  userId: string;
  trigger: number;
}

interface Insight {
  id: string;
  insight: string;
  created_at: string;
  isNew?: boolean;
}

export default function Cortex({ userId, trigger }: CortexProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const analyze = async () => {
    setProcessing(true);

    const [
      { data: tasks },
      { data: profile },
      { data: subjects },
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("subjects").select("*").eq("user_id", userId),
    ]);

    if (!tasks || !profile) { setProcessing(false); return; }

    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);

    const behaviorSummary = `
Student behavioral data:
- Streak: ${profile.streak} days
- Level: ${profile.level}, XP: ${profile.xp}
- Total tasks: ${tasks.length}, Completed: ${completedTasks.length}, Pending: ${pendingTasks.length}
- Subjects: ${subjects?.map(s => s.name).join(", ") || "none"}
- Completion rate: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
- Recent task titles (last 5): ${tasks.slice(0, 5).map(t => t.title).join(", ")}
    `.trim();

    try {
      const response = await fetch("/api/cortex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behaviorSummary }),
      });

      const data = await response.json();
      const insight = data.insight;

      if (insight) {
        const { data: saved } = await supabase
          .from("cortex_insights")
          .insert({ user_id: userId, insight })
          .select()
          .single();

        if (saved) {
          setInsights(prev => {
            const newInsight = { ...saved, isNew: true };
            const updated = [newInsight, ...prev].slice(0, 4);
            setTimeout(() => {
              setInsights(curr => curr.map(i => i.id === saved.id ? { ...i, isNew: false } : i));
            }, 600);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Cortex error:", err);
    }

    setTimeout(() => setProcessing(false), 300);
  };

  useEffect(() => {
    const loadInsights = async () => {
      const { data } = await supabase
        .from("cortex_insights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setInsights(data);
    };
    loadInsights();
  }, []);

  useEffect(() => {
    if (trigger === 0 || !userId) return;
    const timeout = setTimeout(() => analyze(), 600);
    return () => clearTimeout(timeout);
  }, [trigger, userId]);

  return (
    <>
      <style>{`
        @keyframes cortexFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cortexPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }

        @keyframes cortexSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .cortex-insight {
          animation: cortexFadeIn 0.4s ease forwards;
        }

        /* Desktop: right sidebar */
        .cortex-sidebar {
          display: none;
        }

        /* Mobile: bottom card */
        .cortex-card {
          display: block;
        }

        @media (min-width: 900px) {
          .cortex-sidebar {
            display: flex;
          }
          .cortex-card {
            display: none;
          }
        }
      `}</style>

      {/* DESKTOP - Fixed right sidebar */}
      <div className="cortex-sidebar" style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "280px",
        height: "100vh",
        flexDirection: "column",
        gap: "0",
        zIndex: 40,
        background: "rgba(8, 8, 14, 0.85)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(99, 102, 241, 0.1)",
        padding: "32px 20px",
        overflow: "hidden",
      }}>
        {/* Subtle background pulse */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          animation: "cortexPulse 15s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{ marginBottom: "24px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px" }}>🧠</span>
            <p style={{ fontWeight: 800, fontSize: "14px", color: "var(--primary)", letterSpacing: "2px" }}>
              CORTEX
            </p>
            {processing && (
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "2px solid var(--primary)",
                borderTopColor: "transparent",
                marginLeft: "auto",
                animation: "cortexSpin 0.8s linear infinite",
              }} />
            )}
          </div>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", letterSpacing: "1px" }}>
            Learning interpretation layer
          </p>
          <div style={{
            height: "1px",
            background: "linear-gradient(to right, rgba(99,102,241,0.3), transparent)",
            marginTop: "12px",
          }} />
        </div>

        {/* Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
          {insights.length === 0 ? (
            <p style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              fontStyle: "italic",
              lineHeight: 1.6,
              opacity: 0.6,
            }}>
              {processing ? "Analyzing…" : "Idle — awaiting learning signals"}
            </p>
          ) : (
            insights.map((insight, index) => (
              <div
                key={insight.id}
                className="cortex-insight"
                style={{
                  background: "rgba(99,102,241,0.04)",
                  border: "1px solid rgba(99,102,241,0.1)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - index * 0.2),
                  transition: "opacity 0.5s ease",
                }}
              >
                <p style={{
                  fontSize: "12px",
                  lineHeight: 1.6,
                  color: index === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                }}>
                  {insight.insight}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer state */}
        {processing && (
          <p style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "11px",
            color: "var(--primary)",
            opacity: 0.6,
            letterSpacing: "1px",
          }}>
            Analyzing…
          </p>
        )}
      </div>

      {/* MOBILE - Bottom card */}
      <div className="cortex-card" style={{
        background: "rgba(10,10,15,0.8)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: "12px",
        padding: "16px",
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Pulse background */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)",
          animation: "cortexPulse 15s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", position: "relative" }}>
          <span style={{ fontSize: "14px" }}>🧠</span>
          <p style={{ fontWeight: 800, fontSize: "13px", color: "var(--primary)", letterSpacing: "2px" }}>CORTEX</p>
          {processing && (
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              border: "2px solid var(--primary)",
              borderTopColor: "transparent",
              marginLeft: "auto",
              animation: "cortexSpin 0.8s linear infinite",
            }} />
          )}
        </div>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", letterSpacing: "1px", marginBottom: "12px", position: "relative" }}>
          Learning interpretation layer
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
          {insights.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontStyle: "italic" }}>
              {processing ? "Analyzing…" : "Idle — awaiting learning signals"}
            </p>
          ) : (
            insights.map((insight, index) => (
              <div
                key={insight.id}
                className="cortex-insight"
                style={{
                  background: "rgba(99,102,241,0.05)",
                  border: "1px solid rgba(99,102,241,0.1)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - index * 0.2),
                  transition: "opacity 0.5s ease",
                }}
              >
                <p style={{ fontSize: "13px", lineHeight: 1.5, color: index === 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {insight.insight}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}