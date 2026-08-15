"use client";

import { useEffect, useState } from "react";
import { Flame, Shield, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isFreezeAvailable } from "@/lib/streaks";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: boolean;
}

/**
 * Prominent streak display for the dashboard -- flame icon, current streak,
 * and this week's freeze status. Fetches directly from `cortex_memory`
 * (the canonical streak store, see `src/lib/cortex/memoryTracker.ts`)
 * rather than through the dashboard's `getStudentIntelligence()` pipeline,
 * so it stays independent of that shared aggregator's shape.
 */
export default function StreakDisplay() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;

      const { data: memory } = await supabase
        .from("cortex_memory")
        .select("current_streak, longest_streak, streak_freeze_week")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;
      setData({
        currentStreak: memory?.current_streak ?? 0,
        longestStreak: memory?.longest_streak ?? 0,
        freezeAvailable: isFreezeAvailable(memory?.streak_freeze_week ?? undefined, new Date()),
      });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const streak = data?.currentStreak ?? 0;
  const isActive = streak > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 16,
        background: isActive ? "rgba(249, 115, 22, 0.08)" : "var(--card)",
        border: `1px solid ${isActive ? "rgba(249, 115, 22, 0.22)" : "var(--card-border)"}`,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: isActive ? "rgba(249, 115, 22, 0.15)" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Flame size={22} color={isActive ? "#f97316" : "var(--muted-foreground)"} fill={isActive ? "#f97316" : "none"} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading streak…</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{streak}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>
                day{streak === 1 ? "" : "s"}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
              {data && data.longestStreak > data.currentStreak
                ? `Best: ${data.longestStreak} days`
                : isActive
                ? "Personal best run"
                : "Study today to start a new streak"}
            </p>
          </>
        )}
      </div>

      {!loading && (
        <div
          title={data?.freezeAvailable ? "Freeze available this week" : "Freeze already used this week"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 9px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
            color: data?.freezeAvailable ? "#38bdf8" : "var(--muted-foreground)",
            background: data?.freezeAvailable ? "rgba(56, 189, 248, 0.1)" : "var(--muted)",
          }}
        >
          {data?.freezeAvailable ? <Shield size={12} /> : <ShieldOff size={12} />}
          {data?.freezeAvailable ? "Freeze ready" : "Freeze used"}
        </div>
      )}
    </div>
  );
}
