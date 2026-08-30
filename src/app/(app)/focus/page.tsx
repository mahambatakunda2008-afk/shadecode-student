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
  const totalSeconds = selectedPreset === 4 ? customMinutes * 60 : preset.minutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const today = new Date().toDateString();
      const stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}');
      setSessionsToday(stats.sessions);
      setTotalFocusToday(stats.minutes);
    };
    init();
  }, [router, supabase]);

  useEffect(() => {
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
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  async function handleSessionComplete() {
    const focusMinutes = selectedPreset === 4 ? customMinutes : preset.minutes;
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}');
    const newStats = { sessions: stats.sessions + 1, minutes: stats.minutes + focusMinutes };
    localStorage.setItem(`focus_stats_${today}`, JSON.stringify(newStats));
    setSessionsToday(newStats.sessions);
    setTotalFocusToday(newStats.minutes);

    if (userId) {
      try {
        const xpEarned = selectedPreset !== 1 && selectedPreset !== 2 ? Math.round(focusMinutes * 0.5) : 0;
        const response = await fetch("/api/focus/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationMinutes: focusMinutes, mode: preset.label, xpEarned }),
        });
        if (!response.ok) console.error("focus completion failed", await response.text());
      } catch (err) {
        console.error("focus completion error:", err);
      }
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Session Complete 🧠", { body: `${focusMinutes} minute ${preset.label} session finished.`, icon: "/icon-192.png" });
    }
  }
  useEffect(() => { handleSessionCompleteRef.current = handleSessionComplete; });

  const toggleTimer = () => {
    if (isFinished) { setTimeLeft(totalSeconds); setIsFinished(false); }
    setIsRunning((prev) => !prev);
  };
  const resetTimer = () => { setIsRunning(false); setIsFinished(false); setTimeLeft(totalSeconds); };
  const requestNotificationPermission = () => { if ("Notification" in window) Notification.requestPermission(); };
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}><h1 style={{ fontSize: "28px", fontWeight: 800 }}>Focus Timer</h1><p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>Stay locked in. Earn XP for every session.</p></div>
      <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "400px", overflowX: "auto", paddingBottom: "4px" }}>{PRESETS.map((p, i) => <button key={p.label} onClick={() => setSelectedPreset(i)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: "20px", border: selectedPreset === i ? `1px solid ${p.color}` : "1px solid var(--card-border)", background: selectedPreset === i ? `${p.color}20` : "var(--card)", color: selectedPreset === i ? p.color : "var(--muted-foreground)", fontSize: "13px", fontWeight: selectedPreset === i ? 700 : 400, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>{p.icon} {p.label}</button>)}</div>
      {selectedPreset === 4 && <div style={{ width: "100%", maxWidth: "400px" }}><input type="number" value={customMinutes} onChange={(e) => setCustomMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))} min={1} max={120} style={{ width: "100%", background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "10px 14px", color: "var(--foreground)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} placeholder="Minutes (1-120)" /></div>}
      <div style={{ position: "relative", width: "260px", height: "260px" }}><svg width="260" height="260" style={{ transform: "rotate(-90deg)" }}><circle cx="130" cy="130" r="110" fill="none" stroke="var(--muted)" strokeWidth="8" /><circle cx="130" cy="130" r="110" fill="none" stroke={isFinished ? "#22c55e" : preset.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} /></svg><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: "48px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}</div><div style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>{isFinished ? "Complete" : isRunning ? "Focusing…" : "Ready"}</div></div></div>
      <div style={{ display: "flex", gap: "10px" }}><button onClick={toggleTimer} style={{ border: 0, borderRadius: "12px", padding: "12px 28px", background: preset.color, color: "white", fontWeight: 800, cursor: "pointer" }}>{isFinished ? "Start Again" : isRunning ? "Pause" : "Start"}</button><button onClick={resetTimer} style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "12px 20px", background: "var(--card)", color: "var(--foreground)", fontWeight: 700, cursor: "pointer" }}>Reset</button></div>
      <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "400px" }}><div style={{ flex: 1, padding: "16px", borderRadius: "14px", background: "var(--card)", border: "1px solid var(--card-border)" }}><div style={{ fontSize: "24px", fontWeight: 800 }}>{sessionsToday}</div><div style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Sessions today</div></div><div style={{ flex: 1, padding: "16px", borderRadius: "14px", background: "var(--card)", border: "1px solid var(--card-border)" }}><div style={{ fontSize: "24px", fontWeight: 800 }}>{totalFocusToday}m</div><div style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Focus today</div></div></div>
      <button onClick={requestNotificationPermission} style={{ background: "none", border: 0, color: "var(--muted-foreground)", fontSize: "12px", cursor: "pointer" }}>Enable completion notifications</button>
    </div>
  );
}
