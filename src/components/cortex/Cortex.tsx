"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CortexProps {
  userId: string;
  trigger: number; // increment this to force Cortex to re-analyze
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
    setProcessing(true);

    // Gather behavioral data
    const [
      { data: tasks },
      { data: profile },
      { data: subjects },
      { data: recentInsights },
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("subjects").select("*").eq("user_id", userId),
      supabase.from("cortex_insights").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    ]);

    if (!tasks || !profile) { setProcessing(false); return; }

    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);

    // Build behavioral summary for Claude
    const behaviorSummary = `
Student behavioral data:
- Streak: ${profile.streak} days
- Level: ${profile.level}, XP: ${profile.xp}
- Total tasks: ${tasks.length}, Completed: ${completedTasks.length}, Pending: ${pendingTasks.length}
- Subjects: ${subjects?.map(s => s.name).join(", ") || "none"}
- Completion rate: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
- Recent task titles (last 5): ${tasks.slice(0, 5).map(t => t.title).join(", ")}
    `.trim();

    // Call Claude API
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          system: `You are Cortex, a behavioral interpretation layer inside a student productivity app called Shadecode Student.
Your job is to analyze student activity data and output ONE short, neutral insight (1-2 sentences max).

Rules:
- Never motivate or encourage
- Never ask questions
- Never give advice
- No emotional language
- Neutral, analytical tone only
- Observe and reflect patterns only
- Sound like a system, not a chatbot

Example outputs:
"Consistency improving over last 3 sessions."
"Engagement concentrated in short bursts."
"High task completion rate detected in Mathematics."
"Irregular activity pattern identified across subjects."`,
          messages: [
            {
              role: "user",
              content: behaviorSummary,
            },
          ],
        }),
      });

      const data = await response.json();
      const insight = data.content?.[0]?.text?.trim();

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
    // Load existing insights
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
    if (trigger === 0) return;
    const timeout = setTimeout(() => analyze(), 500);
    return () => clearTimeout(timeout);
  }, [trigger]);

  return (
    <div style={{
      background: "rgba(10,10,15,0.8)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "12px",
      padding: "16px",
      backdropFilter: "blur(10px)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "16px" }}>🧠</span>
        <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>CORTEX</p>
        {processing && (
          <span style={{
            fontSize: "11px",
            color: "var(--muted-foreground)",
            marginLeft: "auto",
            animation: "pulse 1s infinite",
          }}>
            processing...
          </span>
        )}
      </div>

      {/* Insights */}
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