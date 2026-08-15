"use client";

import { useEffect, useState } from "react";
import { Target, Loader2, Pencil } from "lucide-react";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/async/fetchWithTimeout";
import type { GoalProgress } from "@/lib/goals";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Weekly study goal card for the dashboard -- shows progress against a
 * focused-study-time target (see src/lib/goals.ts for what "focused study
 * time" does and doesn't measure), or an inline setup form when no goal
 * is set yet.
 */
export default function GoalTracker() {
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [hoursInput, setHoursInput] = useState(5);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/goals", {}, 15000);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to load goal progress");
      setProgress(body);
      if (body.weeklyGoalMinutes) setHoursInput(Math.round(body.weeklyGoalMinutes / 60));
    } catch (err) {
      setError(
        err instanceof FetchTimeoutError
          ? "This is taking longer than expected."
          : err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(
        "/api/goals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weeklyGoalMinutes: hoursInput * 60 }),
        },
        15000
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save goal");
      setProgress(body);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Loader2 size={18} className="animate-spin" color="var(--muted-foreground)" />
      </div>
    );
  }

  const hasGoal = progress?.weeklyGoalMinutes != null;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasGoal && !editing ? 12 : 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "var(--primary-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Target size={16} color="var(--primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Weekly study goal</p>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>
            Focused study time this week
          </p>
        </div>
        {hasGoal && !editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit weekly goal"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 11.5, color: "#ef4444", margin: "0 0 10px" }}>{error}</p>}

      {hasGoal && !editing && progress ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{formatMinutes(progress.minutesThisWeek)}</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              of {formatMinutes(progress.weeklyGoalMinutes!)} goal
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 6,
              background: "var(--muted)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress.percentComplete ?? 0}%`,
                background: progress.goalMet ? "#22c55e" : "var(--primary)",
                borderRadius: 6,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {progress.goalMet && (
            <p style={{ fontSize: 11.5, color: "#22c55e", fontWeight: 600, margin: "8px 0 0" }}>
              Goal reached this week 🎉
            </p>
          )}
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="range"
            min={1}
            max={30}
            value={hoursInput}
            onChange={(e) => setHoursInput(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
            {hoursInput}h
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {saving ? "Saving…" : hasGoal ? "Update" : "Set goal"}
          </button>
        </div>
      )}
    </div>
  );
}
