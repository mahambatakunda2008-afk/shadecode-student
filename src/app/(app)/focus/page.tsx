"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const PRESETS = [
  { label: "Focus", minutes: 25, icon: "🧠", color: "#6366f1" },
  { label: "Short Break", minutes: 5, icon: "☕", color: "#22c55e" },
  { label: "Long Break", minutes: 15, icon: "🌿", color: "#06b6d4" },
  { label: "Sprint", minutes: 45, icon: "⚡", color: "#f59e0b" },
  { label: "Custom", minutes: 0, icon: "⚙️", color: "#8b5cf6" },
];

export default function FocusTimer() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const [userId, setUserId] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleSessionCompleteRef = useRef<() => void>(() => {});
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const preset = PRESETS[selectedPreset];
  const totalSeconds = selectedPreset === 4
    ? customMinutes * 60
    : preset.minutes * 60;

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      // Load today's stats from localStorage
      const today = new Date().toDateString();
      const stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}');
      setSessionsToday(stats.sessions);
      setTotalFocusToday(stats.minutes);
    };
    init();
  }, [router, supabase]);

  useEffect(() => {
    // Reset timer when preset changes
    setTimeLeft(selectedPreset === 4 ? customMinutes * 60 : preset.minutes * 60);
    setIsRunning(false);
    setIsFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [selectedPreset, customMinutes]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            handleSessionCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  async function handleSessionComplete() {
    const focusMinutes = selectedPreset === 4 ? customMinutes : preset.minutes;

    // Update localStorage stats
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}');
    const newStats = {
      sessions: stats.sessions + 1,
      minutes: stats.minutes + focusMinutes,
    };
    localStorage.setItem(`focus_stats_${today}`, JSON.stringify(newStats));
    setSessionsToday(newStats.sessions);
    setTotalFocusToday(newStats.minutes);

    // Persist the session to focus_sessions -- this table already existed
    // with full RLS but nothing in the codebase wrote to it (verified via
    // repo-wide search 2026-08-13), so no per-session, timestamped study
    // log existed anywhere. Wiring it here (not creating a parallel table)
    // is what makes GoalTracker's weekly progress real instead of fabricated.
    if (userId) {
      try {
        const xpEarned =
          selectedPreset !== 1 && selectedPreset !== 2 ? Math.round(focusMinutes * 0.5) : 0;
        await supabase.from("focus_sessions").insert({
          user_id: userId,
          duration_minutes: focusMinutes,
          xp_earned: xpEarned,
          mode: preset.label,
        });
      } catch (err) {
        console.error("focus_sessions insert error:", err);
      }
    }

    // Award XP for focus sessions
    if (userId && selectedPreset !== 1 && selectedPreset !== 2) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("xp, level")
          .eq("id", userId)
          .single();

        if (profile) {
          const xpEarned = Math.round(focusMinutes * 0.5); // 0.5 XP per minute
          const newXp = (profile.xp || 0) + xpEarned;
          const newLevel = Math.floor(newXp / 100) + 1;
          await supabase
            .from("profiles")
            .update({ xp: newXp, level: newLevel })
            .eq("id", userId);
        }
      } catch (err) {
        console.error("XP update error:", err);
      }
    }

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Session Complete 🧠", {
        body: `${focusMinutes} minute ${preset.label} session finished.`,
        icon: "/icon-192.png",
      });
    }
  }
  useEffect(() => { handleSessionCompleteRef.current = handleSessionComplete; });

  const toggleTimer = () => {
    if (isFinished) {
      setTimeLeft(totalSeconds);
      setIsFinished(false);
    }
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalSeconds);
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Focus Timer</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Stay locked in. Earn XP for every session.
        </p>
      </div>

      {/* Preset selector */}
      <div style={{
        display: "flex",
        gap: "8px",
        width: "100%",
        maxWidth: "400px",
        overflowX: "auto",
        paddingBottom: "4px",
      }}>
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setSelectedPreset(i)}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: "20px",
              border: selectedPreset === i ? `1px solid ${p.color}` : "1px solid var(--card-border)",
              background: selectedPreset === i ? `${p.color}20` : "var(--card)",
              color: selectedPreset === i ? p.color : "var(--muted-foreground)",
              fontSize: "13px",
              fontWeight: selectedPreset === i ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Custom minutes input */}
      {selectedPreset === 4 && (
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <input
            type="number"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
            min={1}
            max={120}
            style={{
              width: "100%",
              background: "var(--muted)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "var(--foreground)",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="Minutes (1-120)"
          />
        </div>
      )}

      {/* Circular timer */}
      <div style={{ position: "relative", width: "260px", height: "260px" }}>
        <svg width="260" height="260" style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle */}
          <circle
            cx="130" cy="130" r="110"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="130" cy="130" r="110"
            fill="none"
            stroke={isFinished ? "#22c55e" : preset.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
          />
        </svg>

        {/* Timer display */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
        }}>
          <span style={{ fontSize: "14px" }}>{isFinished ? "✅" : preset.icon}</span>
          <p style={{
            fontSize: "52px",
            fontWeight: 800,
            color: isFinished ? "#22c55e" : preset.color,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {isFinished ? "Complete!" : isRunning ? "Focusing..." : preset.label}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "400px" }}>
        <button
          onClick={resetTimer}
          style={{
            background: "var(--muted)",
            border: "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "14px",
            color: "var(--muted-foreground)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            width: "60px",
          }}
        >
          ↺
        </button>
        <button
          onClick={toggleTimer}
          style={{
            flex: 1,
            background: isRunning ? "rgba(239,68,68,0.1)" : preset.color,
            border: isRunning ? "1px solid rgba(239,68,68,0.3)" : "none",
            borderRadius: "12px",
            padding: "14px",
            color: isRunning ? "var(--danger)" : "white",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: isRunning ? "none" : `0 0 20px ${preset.color}60`,
            transition: "all 0.2s",
          }}
        >
          {isFinished ? "Start Again" : isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={requestNotificationPermission}
          style={{
            background: "var(--muted)",
            border: "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "14px",
            color: "var(--muted-foreground)",
            fontSize: "14px",
            cursor: "pointer",
            width: "60px",
          }}
          title="Enable notifications"
        >
          🔔
        </button>
      </div>

      {/* XP info */}
      {selectedPreset !== 1 && selectedPreset !== 2 && (
        <div style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: "10px",
          padding: "10px 16px",
          fontSize: "13px",
          color: "var(--muted-foreground)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}>
          🔮 Complete this session to earn <strong style={{ color: "#8b5cf6" }}>
            {Math.round((selectedPreset === 4 ? customMinutes : preset.minutes) * 0.5)} XP
          </strong>
        </div>
      )}

      {/* Today's stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        width: "100%",
        maxWidth: "400px",
      }}>
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "14px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#6366f1" }}>{sessionsToday}</p>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>Sessions today</p>
        </div>
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "14px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#f59e0b" }}>{totalFocusToday}m</p>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>Focus time today</p>
        </div>
      </div>
    </div>
  );
}
