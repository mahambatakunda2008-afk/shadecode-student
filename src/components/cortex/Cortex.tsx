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
}

export default function Cortex({ userId, trigger }: CortexProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const analyze = async () => {
  console.log("Cortex analyzing for userId:", userId);
  if (!userId) return;
  setProcessing(true);
  // ... rest of function

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
          setInsights(prev => [saved, ...prev].slice(0, 3));
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
        .limit(3);
      if (data) setInsights(data);
    };
    loadInsights();
  }, []);

  useEffect(() => {
  if (trigger === 0 || !userId) return;
  const timeout = setTimeout(() => analyze(), 500);
  return () => clearTimeout(timeout);
}, [trigger, userId]);

  return (
    <div style={{
      background: "rgba(10,10,15,0.8)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "12px",
      padding: "16px",
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "16px" }}>🧠</span>
        <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>CORTEX</p>
        {processing && (
          <span style={{
            fontSize: "11px",
            color: "var(--muted-foreground)",
            marginLeft: "auto",
          }}>
            processing...
          </span>
        )}
      </div>

      {insights.length === 0 ? (
        <p style={{
          fontSize: "13px",
          color: "var(--muted-foreground)",
          fontStyle: "italic",
        }}>
          Awaiting learning signals...
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {insights.map((insight, index) => (
            <div
              key={insight.id}
              style={{
                background: "rgba(99,102,241,0.05)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: "8px",
                padding: "10px 12px",
                opacity: index === 0 ? 1 : 0.6,
                transition: "opacity 0.3s ease",
              }}
            >
              <p style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--foreground)" }}>
                {insight.insight}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}