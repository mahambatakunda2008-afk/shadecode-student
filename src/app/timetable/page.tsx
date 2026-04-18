"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import "./timetable.css";

interface TimetableSlot {
  id?: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export default function Timetable() {
  const [subjects, setSubjects] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("60");
  const [breakDuration, setBreakDuration] = useState("10");
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("timetable")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time");
      if (data && data.length > 0) setSchedule(data);
    };
    init();
  }, []);

  const generateSchedule = () => {
    const subjectList = subjects.split(",").map(s => s.trim()).filter(Boolean);
    if (subjectList.length === 0) return;

    const slots: TimetableSlot[] = [];
    let [hours, minutes] = startTime.split(":").map(Number);

    const addMinutes = (h: number, m: number, mins: number) => {
      const total = h * 60 + m + mins;
      return { h: Math.floor(total / 60) % 24, m: total % 60 };
    };

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    subjectList.forEach((subject, index) => {
      const start = formatTime(hours, minutes);
      const end_time = addMinutes(hours, minutes, parseInt(duration));
      const end = formatTime(end_time.h, end_time.m);

      slots.push({ subject, start_time: start, end_time: end, is_break: false });

      if (index < subjectList.length - 1) {
        const breakStart = end;
        const breakEnd_time = addMinutes(end_time.h, end_time.m, parseInt(breakDuration));
        const breakEnd = formatTime(breakEnd_time.h, breakEnd_time.m);
        slots.push({ subject: "Break", start_time: breakStart, end_time: breakEnd, is_break: true });
        hours = breakEnd_time.h;
        minutes = breakEnd_time.m;
      } else {
        hours = end_time.h;
        minutes = end_time.m;
      }
    });

    setSchedule(slots);
    setSaved(false);
  };

  const saveSchedule = async () => {
    if (!userId || schedule.length === 0) return;
    setLoading(true);
    await supabase.from("timetable").delete().eq("user_id", userId);
    await supabase.from("timetable").insert(
      schedule.map(slot => ({ ...slot, user_id: userId }))
    );
    setSaved(true);
    setLoading(false);
  };

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
  };

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Timetable</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Generate your smart study schedule
        </p>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Generate Schedule</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
              Subjects (comma separated)
            </p>
            <input
              placeholder="e.g. Math, Physics, English"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Start Time</p>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Study (mins)</p>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Break (mins)</p>
              <input
                type="number"
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={generateSchedule}
            style={{
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 0 16px var(--primary-glow)",
              marginTop: "4px",
            }}
          >
            Generate Schedule
          </button>
        </div>
      </div>

      {schedule.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontWeight: 700 }}>Your Plan</p>
            <button
              onClick={saveSchedule}
              disabled={loading || saved}
              style={{
                background: saved ? "var(--success)" : "var(--muted)",
                color: saved ? "white" : "var(--foreground)",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: saved ? "default" : "pointer",
              }}
            >
              {saved ? "✓ Saved" : loading ? "Saving..." : "Save"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {schedule.map((slot, index) => (
              <div key={index} style={{
                background: slot.is_break ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)",
                border: `1px solid ${slot.is_break ? "rgba(245,158,11,0.2)" : "rgba(99,102,241,0.2)"}`,
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <p style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: slot.is_break ? "#f59e0b" : "var(--primary)",
                }}>
                  {slot.is_break ? "☕ Break" : slot.subject}
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  {slot.start_time} - {slot.end_time}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--card-border)",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              📚 {schedule.filter(s => !s.is_break).length} subjects
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              ☕ {schedule.filter(s => s.is_break).length} breaks
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              ⏱ {schedule.filter(s => !s.is_break).length * parseInt(duration)} mins
            </p>
          </div>
        </div>
      )}
    </div>
  );
}