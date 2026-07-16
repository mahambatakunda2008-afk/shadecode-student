"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { emitCortexEvent } from "@/lib/cortex/events/emit";

interface TimetableSlot {
  id?: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  color?: string;
}

interface SubjectRecord {
  id: string;
  name: string;
}

// Subject color palette
const SUBJECT_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "var(--danger)",
  "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16",
];

const DURATION_PRESETS = [
  { label: "25m", value: "25", icon: "⚡" },
  { label: "45m", value: "45", icon: "📖" },
  { label: "60m", value: "60", icon: "🧠" },
  { label: "90m", value: "90", icon: "🔥" },
];

const BREAK_PRESETS = [
  { label: "5m", value: "5" },
  { label: "10m", value: "10" },
  { label: "15m", value: "15" },
  { label: "20m", value: "20" },
];

const TIME_PRESETS = [
  { label: "🌅 Early", value: "06:00" },
  { label: "🌤 Morning", value: "08:00" },
  { label: "☀️ Midday", value: "12:00" },
  { label: "🌆 Evening", value: "17:00" },
];

export default function Timetable() {
  const [userSubjects, setUserSubjects] = useState<SubjectRecord[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("60");
  const [breakDuration, setBreakDuration] = useState("10");
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subjectColorMap, setSubjectColorMap] = useState<Record<string, string>>({});
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const [{ data: subjectsData }, { data: timetableData }] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("timetable").select("*").eq("user_id", user.id).order("start_time"),
      ]);

      if (subjectsData) setUserSubjects(subjectsData);
      if (timetableData && timetableData.length > 0) setSchedule(timetableData);
    };
    init();
  }, [router, supabase]);

  const getSubjectColor = (subject: string, index: number): string => {
    if (subjectColorMap[subject]) return subjectColorMap[subject];
    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    setSubjectColorMap(prev => ({ ...prev, [subject]: color }));
    return color;
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (!selectedSubjects.includes(trimmed)) {
      setSelectedSubjects(prev => [...prev, trimmed]);
    }
    setCustomSubject("");
  };

  const generateSchedule = () => {
    if (selectedSubjects.length === 0) return;

    const slots: TimetableSlot[] = [];
    let [hours, minutes] = startTime.split(":").map(Number);

    const addMinutes = (h: number, m: number, mins: number) => {
      const total = h * 60 + m + mins;
      return { h: Math.floor(total / 60) % 24, m: total % 60 };
    };

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    selectedSubjects.forEach((subject, index) => {
      const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
      const start = formatTime(hours, minutes);
      const endTime = addMinutes(hours, minutes, parseInt(duration));
      const end = formatTime(endTime.h, endTime.m);

      slots.push({ subject, start_time: start, end_time: end, is_break: false, color });

      if (index < selectedSubjects.length - 1) {
        const breakEnd = addMinutes(endTime.h, endTime.m, parseInt(breakDuration));
        slots.push({
          subject: "Break",
          start_time: end,
          end_time: formatTime(breakEnd.h, breakEnd.m),
          is_break: true,
        });
        hours = breakEnd.h;
        minutes = breakEnd.m;
      } else {
        hours = endTime.h;
        minutes = endTime.m;
      }
    });

    setSchedule(slots);
    setSaved(false);

    if (userId) {
      emitCortexEvent({
        userId,
        type: "timetable.generated",
        source: "timetable",
        data: {
          sessions: slots.filter(s => !s.is_break).length,
          breaks: slots.filter(s => s.is_break).length,
          totalMinutes: slots.filter(s => !s.is_break).length * parseInt(duration),
        },
      });
    }
  };

  const saveSchedule = async () => {
    if (!userId || schedule.length === 0) return;
    setLoading(true);
    await supabase.from("timetable").delete().eq("user_id", userId);
    await supabase.from("timetable").insert(schedule.map(slot => ({ ...slot, user_id: userId })));
    setSaved(true);
    setLoading(false);

    emitCortexEvent({
      userId,
      type: "timetable.saved",
      source: "timetable",
      data: {
        sessions: schedule.filter(s => !s.is_break).length,
        totalMinutes: schedule.filter(s => !s.is_break).length * parseInt(duration),
      },
    });
  };

  const totalStudyMins = schedule.filter(s => !s.is_break).length * parseInt(duration);
  const studySessions = schedule.filter(s => !s.is_break).length;

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Timetable</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Build your colour-coded study plan
        </p>
      </div>

      {/* Subject selector */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>Subjects</p>

        {userSubjects.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            {userSubjects.map((s, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              const selected = selectedSubjects.includes(s.name);
              return (
                <button key={s.id} onClick={() => toggleSubject(s.name)} style={{
                  padding: "6px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                  background: selected ? `${color}20` : "var(--muted)",
                  border: selected ? `1px solid ${color}60` : "1px solid transparent",
                  color: selected ? color : "var(--muted-foreground)",
                  fontWeight: selected ? 700 : 400,
                  transition: "all 0.2s",
                }}>
                  {selected && <span style={{ marginRight: "4px" }}>●</span>}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="Add subject..."
            value={customSubject}
            onChange={e => setCustomSubject(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomSubject()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addCustomSubject} style={{
            background: "var(--primary)", color: "white", border: "none",
            borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer",
          }}>+</button>
        </div>

        {selectedSubjects.length > 0 && (
          <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {selectedSubjects.map((s, i) => (
              <span key={s} style={{
                fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}20`,
                color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
                fontWeight: 600,
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                {s}
                <button onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: "12px" }}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Time settings */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>Schedule Settings</p>

        {/* Start time presets */}
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>Start time</p>
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
          {TIME_PRESETS.map(p => (
            <button key={p.value} onClick={() => setStartTime(p.value)} style={{
              padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
              background: startTime === p.value ? "rgba(99,102,241,0.15)" : "var(--muted)",
              border: startTime === p.value ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
              color: startTime === p.value ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: startTime === p.value ? 700 : 400,
            }}>
              {p.label}
            </button>
          ))}
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{ ...inputStyle, width: "110px", padding: "6px 10px", fontSize: "12px" }} />
        </div>

        {/* Study duration presets */}
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>Study session length</p>
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
          {DURATION_PRESETS.map(p => (
            <button key={p.value} onClick={() => setDuration(p.value)} style={{
              padding: "8px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
              background: duration === p.value ? "rgba(99,102,241,0.15)" : "var(--muted)",
              border: duration === p.value ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
              color: duration === p.value ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: duration === p.value ? 700 : 400,
            }}>
              {p.icon} {p.label}
            </button>
          ))}
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
            placeholder="Custom"
            style={{ ...inputStyle, width: "80px", padding: "6px 10px", fontSize: "12px" }} />
        </div>

        {/* Break duration presets */}
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>Break length</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {BREAK_PRESETS.map(p => (
            <button key={p.value} onClick={() => setBreakDuration(p.value)} style={{
              padding: "6px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
              background: breakDuration === p.value ? "rgba(245,158,11,0.15)" : "var(--muted)",
              border: breakDuration === p.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
              color: breakDuration === p.value ? "#f59e0b" : "var(--muted-foreground)",
              fontWeight: breakDuration === p.value ? 700 : 400,
            }}>
              ☕ {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generateSchedule}
        disabled={selectedSubjects.length === 0}
        style={{
          background: selectedSubjects.length === 0 ? "var(--muted)" : "var(--primary)",
          color: selectedSubjects.length === 0 ? "var(--muted-foreground)" : "white",
          border: "none", borderRadius: "12px", padding: "14px",
          fontWeight: 800, fontSize: "15px",
          cursor: selectedSubjects.length === 0 ? "not-allowed" : "pointer",
          boxShadow: selectedSubjects.length === 0 ? "none" : "0 0 20px var(--primary-glow)",
        }}
      >
        Generate Schedule →
      </button>

      {/* Schedule display */}
      {schedule.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "15px" }}>Today's Plan</p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                {studySessions} sessions · {totalStudyMins} min total
              </p>
            </div>
            <button onClick={saveSchedule} disabled={loading || saved} style={{
              background: saved ? "rgba(34,197,94,0.15)" : "var(--muted)",
              color: saved ? "#22c55e" : "var(--foreground)",
              border: saved ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--card-border)",
              borderRadius: "8px", padding: "8px 14px", fontSize: "13px",
              fontWeight: 600, cursor: saved ? "default" : "pointer",
            }}>
              {saved ? "✓ Saved" : loading ? "Saving..." : "Save Plan"}
            </button>
          </div>

          {/* Visual timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {schedule.map((slot, index) => (
              <div key={index} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: slot.is_break ? "rgba(245,158,11,0.06)" : `${slot.color || "#6366f1"}10`,
                border: `1px solid ${slot.is_break ? "rgba(245,158,11,0.15)" : `${slot.color || "#6366f1"}30`}`,
              }}>
                {/* Color dot */}
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                  background: slot.is_break ? "#f59e0b" : (slot.color || "#6366f1"),
                  boxShadow: `0 0 6px ${slot.is_break ? "#f59e0b" : (slot.color || "#6366f1")}80`,
                }} />

                <p style={{
                  flex: 1, fontWeight: 600, fontSize: "14px",
                  color: slot.is_break ? "#f59e0b" : (slot.color || "var(--primary)"),
                }}>
                  {slot.is_break ? "☕ Break" : slot.subject}
                </p>

                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", flexShrink: 0 }}>
                  {slot.start_time} – {slot.end_time}
                </p>

                {!slot.is_break && (
                  <span style={{
                    fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                    background: `${slot.color || "#6366f1"}20`,
                    color: slot.color || "#6366f1",
                    fontWeight: 600, flexShrink: 0,
                  }}>
                    {duration}m
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            marginTop: "12px", paddingTop: "12px",
            borderTop: "1px solid var(--card-border)",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px",
          }}>
            {[
              { label: "Sessions", value: studySessions, icon: "📚" },
              { label: "Study time", value: `${totalStudyMins}m`, icon: "⏱" },
              { label: "Breaks", value: schedule.filter(s => s.is_break).length, icon: "☕" },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>{stat.icon} {stat.value}</p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
